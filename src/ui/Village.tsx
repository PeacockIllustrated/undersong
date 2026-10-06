// Holloway: the forge, the bunkhouse, tools and torches.
import {
  FORGE,
  HAULS,
  KILN,
  LAMPWORKS,
  TORCH_CRAFT,
  WHETSTONE,
  type BuildingId,
  type CraftId,
  type Recipe,
} from '../data/economy';
import { PICKS } from '../data/items';
import { RES_NAMES, type ResKey } from '../data/resources';
import type { Decimal } from '../sim/decimal';
import { canPay, haulRate, minerCost, nextHaul, nextPick, torchCost, whetstoneCost } from '../sim/economy';
import { minerRate } from '../sim/miners';
import { buildingCost, buildingDef, buildingOffered, craftCost, lanterns, lumenUpkeep } from '../sim/village';
import { lumenMult } from '../sim/power';
import { HELPERS, HELPER_FX } from '../data/helpers';
import { helperCost, helperOffered } from '../sim/helpers';
import { bottleneck } from './feedback';
import { spriteURL } from '../render/sprites';
import type { UiBridge } from './App';
import { RES_ICON } from './icons';
import { fmt } from './format';

function Cost({ costs, have }: { costs: { res: ResKey; amount: Decimal }[]; have: Record<ResKey, Decimal> }) {
  return (
    <span class="cost">
      {costs.map((c) => (
        <span key={c.res} class={have[c.res].gte(c.amount) ? '' : 'short'} title={RES_NAMES[c.res]}>
          <img src={spriteURL(RES_ICON[c.res])} alt={RES_NAMES[c.res]} />
          {fmt(c.amount)}
        </span>
      ))}
    </span>
  );
}

const RECIPES: { id: Recipe; label: string; needs?: (s: UiBridge['game']['state']) => boolean }[] = [
  { id: 'auto', label: 'Any ore' },
  { id: 'copper', label: 'Copper' },
  { id: 'tin', label: 'Tin' },
  {
    id: 'bronze',
    label: 'Bronze',
    needs: (s) => s.res.tinBar.gt(0) || s.res.bronzeBar.gt(0) || s.pickTier >= 1,
  },
  { id: 'iron', label: 'Iron', needs: (s) => s.stats.firsts.iron !== undefined },
  { id: 'silver', label: 'Silver', needs: (s) => s.res.silverOre.gt(0) || s.res.silverBar.gt(0) },
  { id: 'gold', label: 'Gold', needs: (s) => s.res.goldOre.gt(0) || s.res.goldBar.gt(0) },
];

type State = UiBridge['game']['state'];

/** A village building bought in levels, with what it makes and a craft or two. */
function Building({
  ui,
  id,
  children,
}: {
  ui: UiBridge;
  id: BuildingId;
  children: preact.ComponentChildren;
}) {
  const s = ui.game.state;
  if (!buildingOffered(s, id)) return null;
  const def = buildingDef(id);
  const lv = s.buildings[id];
  const cost = buildingCost(s, id);
  return (
    <section class="card">
      <img class="prop" src={spriteURL(def.sprite, 1)} alt="" />
      <div class="grow">
        <h3>
          {def.name}
          {lv > 0 ? ` · level ${lv}` : ''}
        </h3>
        <p>{def.text}</p>
        {lv > 0 && children}
        <div class="row">
          <button
            class={`btn ${lv === 0 ? 'primary' : ''} ${canPay(s, cost) ? 'can' : ''}`}
            disabled={!canPay(s, cost)}
            onClick={() => ui.dispatch({ type: 'buyBuilding', id })}
          >
            {lv === 0 ? `Build the ${def.name}` : 'Add a level'}
          </button>
          <Cost costs={cost} have={s.res} />
        </div>
      </div>
    </section>
  );
}

function Craft({ ui, id, label, s }: { ui: UiBridge; id: CraftId; label: string; s: State }) {
  const c = craftCost(id);
  return (
    <div class="row">
      <button class="btn" disabled={!canPay(s, c)} onClick={() => ui.dispatch({ type: 'craft', id })}>
        {label}
      </button>
      <Cost costs={c} have={s.res} />
      <span class="small">{fmt(s.res[id])} in hand</span>
    </div>
  );
}

/** Hands about the village (ADR-020): each takes a chore off you, and stays through a Cave-in. */
function Helpers({ ui }: { ui: UiBridge }) {
  const s = ui.game.state;
  const offered = HELPERS.filter((h) => helperOffered(s, h.id));
  if (!offered.length) return null;
  return (
    <section class="card">
      <img class="icon" src={spriteURL('pell')} alt="" />
      <div class="grow">
        <h3>Hands about the village</h3>
        <p class="small">Each one takes a chore off you for good. They stay through a Cave-in.</p>
        {offered.map((h) => {
          const lv = s.helpers[h.id] ?? 0;
          const c = helperCost(s, h.id);
          return (
            <div class="helper" key={h.id}>
              <img class="icon" src={spriteURL(h.who)} alt="" />
              <div class="grow">
                <b>
                  {h.name}
                  {lv > 0 ? (h.levels.length > 1 ? ` · level ${lv}` : ' · hired') : ''}
                </b>
                <span class="small">
                  {h.id === 'pell'
                    ? `${h.text} One every ${HELPER_FX.pellEvery[Math.max(0, lv - 1)]} s${lv > 0 && c ? `; next level, every ${HELPER_FX.pellEvery[lv]} s` : ''}.`
                    : h.text}
                </span>
                {c && (
                  <div class="row">
                    <button
                      class={`btn ${canPay(s, c) ? 'can' : ''}`}
                      disabled={!canPay(s, c)}
                      onClick={() => ui.dispatch({ type: 'hireHelper', id: h.id })}
                    >
                      {lv === 0 ? 'Hire' : 'Train'}
                    </button>
                    <Cost costs={c} have={s.res} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function VillageSheet({ ui, close }: { ui: UiBridge; close: () => void }) {
  const s = ui.game.state;
  const mc = minerCost(s);
  const minerC = [{ res: mc.res, amount: mc.amount }];
  const pickC = nextPick(s);
  const haulC = nextHaul(s);
  const torchC = torchCost();
  const working = s.miners.filter((m) => m.target && m.stalledBy === null);
  const rate = s.miners.reduce((a, m) => a + minerRate(ui.game, m), 0);
  const stalled = s.miners.filter((m) => m.stalledBy !== null).length;
  const haul = HAULS[s.haulTier]!;
  const neck = bottleneck(ui.game);
  const whetC = whetstoneCost(s);
  const nextP = PICKS[s.pickTier + 1];
  const nextH = HAULS[s.haulTier + 1];
  const x = (a: number, b: number): string => `×${(a / b).toFixed(2).replace(/\.?0+$/, '')}`;

  return (
    <div class="sheet-wrap side" onClick={(e) => e.target === e.currentTarget && close()}>
      <div class="panel sheet" role="dialog" aria-label="Village">
        <div class="sheet-head">
          <h2>Holloway</h2>
          <button class="btn" onClick={close} aria-label="Close">
            ✕
          </button>
        </div>

        {neck && (
          <section class="card neck-card">
            <div class="grow">
              <h3>Held back by: {neck.what}</h3>
              <p>{neck.hint}</p>
            </div>
          </section>
        )}

        <section class="card">
          <img class="prop" src={spriteURL('forge', 1)} alt="" />
          <div class="grow">
            <h3>Forge</h3>
            <p>
              Turns {FORGE.orePerBar} ore into a bar every {FORGE.seconds} s. Bronze takes{' '}
              {FORGE.bronze.copperBar} copper bars and {FORGE.bronze.tinBar} tin bar.
            </p>
            <div class="seg" role="radiogroup" aria-label="Forge recipe">
              {RECIPES.filter((r) => !r.needs || r.needs(s)).map((r) => (
                <button
                  key={r.id}
                  role="radio"
                  aria-checked={s.forge.recipe === r.id}
                  class={s.forge.recipe === r.id ? 'on' : ''}
                  onClick={() => ui.dispatch({ type: 'setRecipe', recipe: r.id })}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div class="bar">
              <i style={{ width: `${Math.min(100, (s.forge.progress / FORGE.seconds) * 100)}%` }} />
            </div>
          </div>
        </section>

        <section class="card">
          <img class="prop" src={spriteURL('bunkhouse')} alt="" />
          <div class="grow">
            <h3>Bunkhouse</h3>
            <p>
              {s.miners.length === 0
                ? 'Miners work the nearest ore on their own and send it up the shaft. They dig slowly in the dark.'
                : `${s.miners.length} miner${s.miners.length > 1 ? 's' : ''}, ${working.length} at a face${stalled ? `, ${stalled} held up by beetles` : ''}. About ${rate.toFixed(1)} hardness a second.`}
            </p>
            <div class="row">
              <button
                class={`btn primary ${canPay(s, minerC) ? 'can' : ''}`}
                disabled={!canPay(s, minerC)}
                onClick={() => ui.dispatch({ type: 'hireMiner' })}
              >
                Hire a miner
              </button>
              <Cost costs={minerC} have={s.res} />
            </div>
          </div>
        </section>

        <Helpers ui={ui} />

        <section class="card">
          <img class="icon" src={spriteURL(PICKS[s.pickTier]!.sprite)} alt="" />
          <div class="grow">
            <h3>{PICKS[s.pickTier]!.name}</h3>
            <p>
              Pick power {PICKS[s.pickTier]!.power}. Everyone in the village digs with the best pick you own.
            </p>
            <div class="row">
              <button
                class={`btn ${canPay(s, whetC) ? 'can' : ''}`}
                disabled={!canPay(s, whetC)}
                onClick={() => ui.dispatch({ type: 'whetstone' })}
              >
                Sharpen it <em>+{Math.round(WHETSTONE.perLevel * 100)}% hand-mining</em>
              </button>
              <Cost costs={whetC} have={s.res} />
              {s.whetstone > 0 && <span class="small">level {s.whetstone}</span>}
            </div>
            {pickC ? (
              <div class="row">
                <button
                  class={`btn ${canPay(s, pickC) ? 'can' : ''}`}
                  disabled={!canPay(s, pickC)}
                  onClick={() => ui.dispatch({ type: 'buyPick' })}
                >
                  Forge the {nextP!.name.toLowerCase()}{' '}
                  <em>{x(nextP!.power, PICKS[s.pickTier]!.power)} speed</em>
                </button>
                <Cost costs={pickC} have={s.res} />
              </div>
            ) : (
              <p class="small">The best pick Holloway knows how to make, for now.</p>
            )}
          </div>
        </section>

        <section class="card">
          <img class="prop" src={spriteURL('headframe', 1)} alt="" />
          <div class="grow">
            <h3>{haul.name}</h3>
            <p>
              Hauls up to {haulRate(ui.game).toFixed(2)} ore a second from this depth ({haul.speed} tile/s,{' '}
              {haul.capacity} a load).{' '}
              {Object.values(s.underground).some((v) => v.gt(0)) ? 'Ore is waiting at the bottom.' : ''}
            </p>
            {haulC && (
              <div class="row">
                <button
                  class={`btn ${canPay(s, haulC) ? 'can' : ''}`}
                  disabled={!canPay(s, haulC)}
                  onClick={() => ui.dispatch({ type: 'buyHaul' })}
                >
                  Build the {nextH!.name.toLowerCase()}{' '}
                  <em>{x(nextH!.speed * nextH!.capacity, haul.speed * haul.capacity)} haulage</em>
                </button>
                <Cost costs={haulC} have={s.res} />
              </div>
            )}
          </div>
        </section>

        <Building ui={ui} id="lampworks">
          <p class="small">
            {s.res.spores.gt(0)
              ? `Turning ${s.buildings.lampworks} spore${s.buildings.lampworks > 1 ? 's' : ''} a second into ${LAMPWORKS.lumen * lumenMult(s) * s.buildings.lampworks} Lumen.`
              : 'Waiting on glowcap spores. Miners pick them from the cavern walls.'}{' '}
            {lanterns(ui.game).length > 0 &&
              `${lanterns(ui.game).length} lantern${lanterns(ui.game).length > 1 ? 's' : ''} burn ${lumenUpkeep(ui.game).toFixed(2)} Lumen a second${ui.game.world.lanternsLit ? '.' : ', but they are dark: no Lumen.'}`}
          </p>
          <Craft ui={ui} id="lantern" label={`Make a lantern`} s={s} />
        </Building>

        <Building ui={ui} id="kiln">
          <p class="small">
            Bakes {KILN.rubble} rubble into a brick every {KILN.seconds / s.buildings.kiln} s. Rubble comes
            from the stone you dig by hand.
          </p>
          <Craft ui={ui} id="support" label={`Make a support`} s={s} />
        </Building>

        <section class="card">
          <img class="icon" src={spriteURL('obj-torch')} alt="" />
          <div class="grow">
            <h3>Torches · {fmt(s.res.torch)} in hand</h3>
            <p>Light a face and the miners there work at full pace. Use the Torch tool to place one.</p>
            <div class="row">
              <button
                class="btn"
                disabled={!canPay(s, torchC)}
                onClick={() => ui.dispatch({ type: 'craftTorches' })}
              >
                Make {TORCH_CRAFT.makes}
              </button>
              <Cost costs={torchC} have={s.res} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

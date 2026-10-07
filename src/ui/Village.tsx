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
import { canPay, haulRate, minerCost, nextHaul, nextPick, torchCost, whetstoneCost } from '../sim/economy';
import { minerOreRate } from '../sim/miners';
import { buildingCost, buildingDef, buildingOffered, craftCost, lanterns, lumenUpkeep } from '../sim/village';
import { lumenMult } from '../sim/power';
import { CHARMS } from '../data/charms';
import { PUMP } from '../data/water';
import { canWeave, charmSlots, weaveCost } from '../sim/charms';
import { pumpRate } from '../sim/water';
import { OBJECTS } from '../data/objects';
import { HELPERS, HELPER_FX } from '../data/helpers';
import { helperCost, helperOffered } from '../sim/helpers';
import { bottleneck } from './feedback';
import { useEffect, useState } from 'preact/hooks';
import { BulkToggle, BuyRow, Cost, Desc, PriceButton, first } from './BuyRow';
import { spriteURL } from '../render/sprites';
import type { UiBridge } from './App';
import { fmt, mult, num, perMin } from './format';
import { CairnAndTally, Fields, Woodlot, fieldsReady, woodReady } from './Surface';

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
    <section class="card" data-card={id} style={first(canPay(s, cost))}>
      <img class="prop" src={spriteURL(def.sprite, 1)} alt="" />
      <div class="grow">
        <h3>
          {def.name}
          {lv > 0 ? ` · level ${lv}` : ''}
        </h3>
        <Desc>{def.text}</Desc>
        {lv > 0 && children}
        <PriceButton
          s={s}
          costs={cost}
          primary={lv === 0}
          onClick={() => ui.dispatch({ type: 'buyBuilding', id })}
        >
          {lv === 0 ? `Build the ${def.name}` : 'Add a level'}
        </PriceButton>
      </div>
    </section>
  );
}

function Craft({ ui, id, label, s }: { ui: UiBridge; id: CraftId; label: string; s: State }) {
  const c = craftCost(s, id);
  return (
    <>
      <PriceButton s={s} costs={c} onClick={() => ui.dispatch({ type: 'craft', id })}>
        {label}
      </PriceButton>
      <p class="small">{fmt(s.res[id])} in hand</p>
    </>
  );
}

/** canon §13: weave each known verse once, slot up to 1 + loom levels. */
function Charms({ ui }: { ui: UiBridge }) {
  const s = ui.game.state;
  const cost = weaveCost(s);
  const slots = charmSlots(s);
  return (
    <div class="charms">
      <p class="small">
        {s.charms.equipped.length} of {slots} charm slot{slots > 1 ? 's' : ''} in use. Woven charms are kept
        through a Cave-in.
      </p>
      {CHARMS.filter((c) => s.verses.known[c.verse]).map((c) => {
        const owned = s.charms.owned.includes(c.id);
        const on = s.charms.equipped.includes(c.id);
        return (
          <div class="row charm" key={c.id}>
            <img class="icon" src={spriteURL('charm')} alt="" />
            <span class="grow">
              <b>{c.name}</b> · {c.text}
            </span>
            {owned ? (
              <button
                class={`btn ${on ? 'primary' : ''}`}
                disabled={!on && s.charms.equipped.length >= slots}
                onClick={() => ui.dispatch({ type: 'equip', id: c.id })}
              >
                {on ? 'Worn' : 'Wear'}
              </button>
            ) : (
              <>
                <button
                  class="btn"
                  disabled={!canWeave(s, c.id) || !canPay(s, cost)}
                  onClick={() => ui.dispatch({ type: 'weave', id: c.id })}
                >
                  Weave
                </button>
                <Cost costs={cost} have={s.res} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Hands about the village (ADR-020): each takes a chore off you, and stays through a Cave-in. */
function Helpers({ ui }: { ui: UiBridge }) {
  const s = ui.game.state;
  const offered = HELPERS.filter((h) => helperOffered(s, h.id));
  if (!offered.length) return null;
  const can = (id: (typeof HELPERS)[number]['id']): boolean => {
    const c = helperCost(s, id);
    return !!c && canPay(s, c);
  };
  return (
    <section class="card">
      <img class="icon" src={spriteURL('pell')} alt="" />
      <div class="grow">
        <h3>Hands about the village</h3>
        <p class="small">Each one takes a chore off you for good. They stay through a Cave-in.</p>
        {[...offered]
          .sort((a, b) => Number(can(b.id)) - Number(can(a.id)))
          .map((h) => {
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
                    <PriceButton
                      s={s}
                      costs={c}
                      onClick={() => ui.dispatch({ type: 'hireHelper', id: h.id })}
                    >
                      {lv === 0 ? 'Hire' : 'Train'}
                    </PriceButton>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}

export type VillageTab = 'build' | 'fields' | 'wood' | 'hands' | 'loom';
/** The last tab used, kept for the session. */
let lastTab: VillageTab = 'build';
/** Open the Village on a given tab next time (a tip's "Show me"). */
export function villageTab(t: VillageTab): void {
  lastTab = t;
}
/** M8-06: the card an alert sent you to, scrolled to and lit once when the sheet opens. */
let focus: string | null = null;
export function villageFocus(card: string): void {
  lastTab = 'build';
  focus = card;
}

export function VillageSheet({ ui, close }: { ui: UiBridge; close: () => void }) {
  const s = ui.game.state;
  const mc = minerCost(s);
  const minerC = [{ res: mc.res, amount: mc.amount }];
  const pickC = nextPick(s);
  const haulC = nextHaul(s);
  const torchC = torchCost();
  const working = s.miners.filter((m) => m.target && m.stalledBy === null);
  const stalled = s.miners.filter((m) => m.stalledBy !== null).length;
  const haul = HAULS[s.haulTier]!;
  const neck = bottleneck(ui.game);
  const whetC = whetstoneCost(s);
  const nextP = PICKS[s.pickTier + 1];
  const nextH = HAULS[s.haulTier + 1];
  const x = (a: number, b: number): string => `×${mult(a / b)}`;
  const hands = HELPERS.filter((h) => helperOffered(s, h.id));
  const tabs: { id: VillageTab; label: string; n: number }[] = [
    {
      id: 'build',
      label: 'Build',
      n: [minerC, pickC, haulC, whetC].filter((c) => c && canPay(s, c)).length,
    },
  ];
  if (s.surface.tansy) tabs.push({ id: 'fields', label: 'Fields', n: fieldsReady(s) });
  if (s.surface.rook) tabs.push({ id: 'wood', label: 'Woodlot', n: woodReady(s) });
  if (hands.length)
    tabs.push({
      id: 'hands',
      label: 'Hands',
      n: hands.filter((h) => {
        const c = helperCost(s, h.id);
        return !!c && canPay(s, c);
      }).length,
    });
  if (buildingOffered(s, 'songloom'))
    tabs.push({
      id: 'loom',
      label: 'Loom',
      n:
        (canPay(s, buildingCost(s, 'songloom')) ? 1 : 0) +
        CHARMS.filter((c) => canWeave(s, c.id) && canPay(s, weaveCost(s))).length,
    });
  const [picked, setTab] = useState<VillageTab>(lastTab);
  useEffect(() => {
    if (!focus) return;
    const el = document.querySelector<HTMLElement>(`[data-card="${focus}"]`);
    focus = null;
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.classList.add('pulse');
  }, []);
  const tab = tabs.some((t) => t.id === picked) ? picked : 'build';

  return (
    <div class="sheet-wrap side half" onClick={(e) => e.target === e.currentTarget && close()}>
      <div class="panel sheet" role="dialog" aria-label="Village">
        <div class="sheet-head">
          <h2>Holloway</h2>
          <button class="btn" onClick={close} aria-label="Close">
            ✕
          </button>
        </div>

        <BulkToggle />

        {neck && (
          <section class="card neck-card">
            <div class="grow">
              <h3>Held back by: {neck.what}</h3>
              <Desc>{neck.hint}</Desc>
            </div>
          </section>
        )}

        {tabs.length > 1 && (
          <div class="tabs" role="tablist" aria-label="Village">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                class={tab === t.id ? 'on' : ''}
                onClick={() => {
                  lastTab = t.id;
                  setTab(t.id);
                  if (t.id !== 'build') ui.dispatch({ type: 'note', key: `tab:${t.id}` });
                }}
              >
                {t.label}
                {t.id !== 'build' && !s.story.ever.includes(`tab:${t.id}`) && <span class="pip">NEW</span>}
                {t.n > 0 && <span class="count">{t.n}</span>}
              </button>
            ))}
          </div>
        )}

        <section class="card">
          <img class="prop" src={spriteURL('forge', 1)} alt="" />
          <div class="grow">
            <h3>Forge</h3>
            <Desc>
              Turns {FORGE.orePerBar} ore into a bar every {FORGE.seconds} s. Bronze takes{' '}
              {FORGE.bronze.copperBar} copper bars and {FORGE.bronze.tinBar} tin bar.
            </Desc>
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
            <Desc>
              {s.miners.length === 0
                ? 'Miners work the nearest ore on their own and send it up the shaft. They dig slowly in the dark.'
                : `${s.miners.length} miner${s.miners.length > 1 ? 's' : ''}, ${working.length} at a face${stalled ? `, ${stalled} held up by pests` : ''}. About ${perMin(minerOreRate(ui.game))} of ore.`}
            </Desc>
            <BuyRow ui={ui} of={{ k: 'miner' }} primary>
              Hire a miner
            </BuyRow>
          </div>
        </section>

        {tab === 'build' && (
          <div class="shop">
            <section
              class="card"
              data-card="pick"
              style={first(canPay(s, whetC) || (!!pickC && canPay(s, pickC)))}
            >
              <img class="icon" src={spriteURL(PICKS[s.pickTier]!.sprite)} alt="" />
              <div class="grow">
                <h3>{PICKS[s.pickTier]!.name}</h3>
                <Desc>
                  Pick power {PICKS[s.pickTier]!.power}. Everyone in the village digs with the best pick you
                  own.
                </Desc>
                <BuyRow ui={ui} of={{ k: 'whetstone' }}>
                  Sharpen it <em>+{Math.round(WHETSTONE.perLevel * 100)}% hand-mining</em>
                </BuyRow>
                {s.whetstone > 0 && <p class="small">Whetstone level {s.whetstone}</p>}
                {pickC ? (
                  <PriceButton s={s} costs={pickC} onClick={() => ui.dispatch({ type: 'buyPick' })}>
                    Forge the {nextP!.name.toLowerCase()}{' '}
                    <em>{x(nextP!.power, PICKS[s.pickTier]!.power)} speed</em>
                  </PriceButton>
                ) : (
                  <p class="small">The best pick Holloway knows how to make, for now.</p>
                )}
              </div>
            </section>

            <section class="card" data-card="haul" style={first(!!haulC && canPay(s, haulC))}>
              <img class="prop" src={spriteURL('headframe', 1)} alt="" />
              <div class="grow">
                <h3>{haul.name}</h3>
                <Desc>
                  Hauls up to {perMin(haulRate(ui.game))} of ore from this depth ({haul.speed} tile/s,{' '}
                  {haul.capacity} a load).{' '}
                  {Object.values(s.underground).some((v) => v.gt(0)) ? 'Ore is waiting at the bottom.' : ''}
                </Desc>
                {haulC && (
                  <PriceButton s={s} costs={haulC} onClick={() => ui.dispatch({ type: 'buyHaul' })}>
                    Build the {nextH!.name.toLowerCase()}{' '}
                    <em>{x(nextH!.speed * nextH!.capacity, haul.speed * haul.capacity)} haulage</em>
                  </PriceButton>
                )}
              </div>
            </section>

            <Building ui={ui} id="lampworks">
              <p class="small">
                {s.res.spores.gt(0)
                  ? `Turning ${s.buildings.lampworks} spore${s.buildings.lampworks > 1 ? 's' : ''} a second into ${LAMPWORKS.lumen * lumenMult(s) * s.buildings.lampworks} Lumen.`
                  : 'Waiting on glowcap spores. Miners pick them from the cavern walls.'}{' '}
                {lanterns(ui.game).length > 0 &&
                  `${lanterns(ui.game).length} lantern${lanterns(ui.game).length > 1 ? 's' : ''} burn ${perMin(lumenUpkeep(ui.game))} of Lumen${ui.game.world.lanternsLit ? '.' : ', but they are dark: no Lumen.'}`}
              </p>
              <Craft ui={ui} id="lantern" label={`Make a lantern`} s={s} />
            </Building>

            <Building ui={ui} id="kiln">
              <p class="small">
                Bakes {KILN.rubble} rubble into a brick every {KILN.seconds / s.buildings.kiln} s. Rubble
                comes from the stone you dig by hand.
              </p>
              <Craft ui={ui} id="support" label={`Make a support`} s={s} />
            </Building>

            {(s.stats.firsts.halls !== undefined || s.res.pump.gt(0)) && (
              <section class="card" style={first(canPay(s, craftCost(s, 'pump')))}>
                <img class="icon" src={spriteURL('obj-pump')} alt="" />
                <div class="grow">
                  <h3>Pumps · {fmt(s.res.pump)} in hand</h3>
                  <Desc>
                    Each pump drains {num(pumpRate(ui.game))} water a second within {PUMP.radius} tiles, from
                    the top down. Nobody can dig standing in a flooded tunnel. Use the Pump tool to set one.
                  </Desc>
                  <Craft ui={ui} id="pump" label="Make a pump" s={s} />
                </div>
              </section>
            )}

            {(s.stats.firsts.ember !== undefined || s.res.vent.gt(0)) && (
              <section class="card" style={first(canPay(s, craftCost(s, 'vent')))}>
                <img class="icon" src={spriteURL('obj-vent')} alt="" />
                <div class="grow">
                  <h3>Cooling vents · {fmt(s.res.vent)} in hand</h3>
                  <Desc>
                    A vent cools every face within {OBJECTS.vent.radius} tiles. Miners won’t work rock that is
                    too hot. Standing water cools a face too. Use the Vent tool to set one.
                  </Desc>
                  <Craft ui={ui} id="vent" label="Make a vent" s={s} />
                </div>
              </section>
            )}

            <section class="card" style={first(canPay(s, torchC))}>
              <img class="icon" src={spriteURL('obj-torch')} alt="" />
              <div class="grow">
                <h3>Torches · {fmt(s.res.torch)} in hand</h3>
                <Desc>
                  Light a face and the miners there work at full pace. Use the Torch tool to place one.
                </Desc>
                <PriceButton s={s} costs={torchC} onClick={() => ui.dispatch({ type: 'craftTorches' })}>
                  Make {TORCH_CRAFT.makes}
                </PriceButton>
              </div>
            </section>
            <CairnAndTally ui={ui} />
          </div>
        )}
        {tab === 'fields' && <Fields ui={ui} />}
        {tab === 'wood' && <Woodlot ui={ui} />}
        {tab === 'hands' && <Helpers ui={ui} />}
        {tab === 'loom' && (
          <Building ui={ui} id="songloom">
            <Charms ui={ui} />
          </Building>
        )}
      </div>
    </div>
  );
}

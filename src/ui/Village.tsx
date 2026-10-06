// Holloway: the forge, the bunkhouse, tools and torches.
import { FORGE, HAULS, TORCH_CRAFT, type Recipe } from '../data/economy';
import { PICKS } from '../data/items';
import { RES_NAMES, type ResKey } from '../data/resources';
import type { Decimal } from '../sim/decimal';
import { canPay, haulRate, minerCost, nextHaul, nextPick, torchCost } from '../sim/economy';
import { minerRate } from '../sim/miners';
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
];

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

  return (
    <div class="sheet-wrap side" onClick={(e) => e.target === e.currentTarget && close()}>
      <div class="panel sheet" role="dialog" aria-label="Village">
        <div class="sheet-head">
          <h2>Holloway</h2>
          <button class="btn" onClick={close} aria-label="Close">
            ✕
          </button>
        </div>

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
                class="btn primary"
                disabled={!canPay(s, minerC)}
                onClick={() => ui.dispatch({ type: 'hireMiner' })}
              >
                Hire a miner
              </button>
              <Cost costs={minerC} have={s.res} />
            </div>
          </div>
        </section>

        <section class="card">
          <img class="icon" src={spriteURL(PICKS[s.pickTier]!.sprite)} alt="" />
          <div class="grow">
            <h3>{PICKS[s.pickTier]!.name}</h3>
            <p>
              Pick power {PICKS[s.pickTier]!.power}. Everyone in the village digs with the best pick you own.
            </p>
            {pickC ? (
              <div class="row">
                <button
                  class="btn"
                  disabled={!canPay(s, pickC)}
                  onClick={() => ui.dispatch({ type: 'buyPick' })}
                >
                  Forge the {PICKS[s.pickTier + 1]!.name.toLowerCase()}
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
                  class="btn"
                  disabled={!canPay(s, haulC)}
                  onClick={() => ui.dispatch({ type: 'buyHaul' })}
                >
                  Build the {HAULS[s.haulTier + 1]!.name.toLowerCase()}
                </button>
                <Cost costs={haulC} have={s.res} />
              </div>
            )}
          </div>
        </section>

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

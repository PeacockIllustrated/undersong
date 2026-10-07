// Holloway above (M6): Tansy's fields and cookhouse, and Rook's woodlot. canon §17
import {
  ACT_CROPS,
  CAIRN,
  FEAST,
  FIELDS,
  MEALS,
  WOODLOT,
  WOOD_BUYS,
  PIT_PROP,
  type MealDef,
} from '../data/surface';
import { TALLY_SOURCES, tallyRates, type TallySource } from '../sim/tally';
import { canPay } from '../sim/economy';
import {
  cellarCost,
  cellarOffered,
  feastNeed,
  feasting,
  growing,
  hotbedCost,
  hotbedsOffered,
  paddyCost,
  pumpsPlaced,
  isElder,
  mealCost,
  plotCost,
  ripe,
  saplingCost,
  treeStage,
  woodCost,
} from '../sim/surface';
import { D } from '../sim/decimal';
import { spriteURL } from '../render/sprites';
import type { UiBridge } from './App';
import { BuyRow, Desc, PriceButton, first } from './BuyRow';
import { fmt } from './format';

type State = UiBridge['game']['state'];

const STAGE = ['sapling', 'young', 'grown', 'old'];

/** A meal's effect at level lv, for buttons and toasts. Pepper broth is heat, not a percentage. */
export const mealFx = (m: MealDef, lv: number): string =>
  m.id === 'broth' ? `+${(m.per * lv).toFixed(1)} heat` : `+${Math.round(m.per * lv * 100)}%`;

/** A meal shows once its crop grows here (or some of the crop is in hand). */
const mealShown = (s: State, m: MealDef): boolean =>
  m.res === 'barley' || s.res[m.res].gt(0) || s.surface.plots.some((p) => p.crop === m.res);

const can = (s: State, c: ReturnType<typeof paddyCost>): boolean => !!c && canPay(s, c);

/** Things on the Fields tab the player can do now, for the tab's count. */
export function fieldsReady(s: State): number {
  const pc = plotCost(s);
  return (
    (pc && canPay(s, pc) ? 1 : 0) +
    (can(s, paddyCost(s)) ? 1 : 0) +
    (can(s, hotbedCost(s)) ? 1 : 0) +
    (can(s, cellarCost(s)) ? 1 : 0) +
    MEALS.filter((m) => mealShown(s, m) && can(s, mealCost(s, m.id))).length +
    (!feasting(s) && s.surface.feast >= feastNeed(s) ? 1 : 0)
  );
}

export function woodReady(s: State): number {
  const sc = saplingCost(s);
  return (
    (sc && canPay(s, sc) ? 1 : 0) +
    WOOD_BUYS.filter((b) => {
      const c = woodCost(s, b.id);
      return !!c && canPay(s, c);
    }).length
  );
}

export function Fields({ ui }: { ui: UiBridge }) {
  const s = ui.game.state;
  const sf = s.surface;
  const pc = plotCost(s);
  const need = feastNeed(s);
  const on = feasting(s);
  const left = Math.ceil((sf.feastUntil - s.t) / 1000);
  const r = ripe(s);
  return (
    <div class="shop">
      <section class="card" style={first(can(s, pc))}>
        <img class="prop" src={spriteURL('tansy')} alt="" />
        <div class="grow">
          <h3>
            Tansy’s fields · {sf.plots.length} plot{sf.plots.length === 1 ? '' : 's'}
          </h3>
          <Desc>
            Barley ripens in {FIELDS.ripenS} s and gives {FIELDS.yield}, or {FIELDS.yield * FIELDS.handMult}{' '}
            when you reap it yourself: tap a ripe plot east of the shaft. About one ear in{' '}
            {Math.round(1 / FIELDS.goldenChance)} comes up golden and pays ×{FIELDS.goldenMult}.
          </Desc>
          <p class="small">
            {r > 0 ? `${r} ripe now.` : 'Nothing ripe yet.'}
            {s.helpers.tansy ? ' Tansy reaps whatever ripens.' : ''}
          </p>
          {pc ? (
            <BuyRow ui={ui} of={{ k: 'plot' }}>
              Dig a new plot
            </BuyRow>
          ) : (
            <p class="small">Every plot on the hillside is sown.</p>
          )}
        </div>
      </section>

      <ActCrops ui={ui} />

      <section
        class="card"
        style={first(
          MEALS.some((m) => mealShown(s, m) && can(s, mealCost(s, m.id))) || (!on && sf.feast >= need),
        )}
      >
        <img class="prop" src={spriteURL('cookhouse', on ? 1 : 0)} alt="" />
        <div class="grow">
          <h3>The cookhouse · {fmt(s.res.barley)} barley</h3>
          <Desc>Meals last until the Cave-in.</Desc>
          {MEALS.filter((m) => mealShown(s, m)).map((m) => {
            const c = mealCost(s, m.id);
            const lv = sf.meals[m.id];
            if (!c)
              return (
                <p class="small" key={m.id}>
                  {m.name}: as much as the cookhouse can make. {m.text} · {mealFx(m, lv)} now
                </p>
              );
            return (
              <div key={m.id}>
                <BuyRow ui={ui} of={{ k: 'meal', id: m.id }}>
                  {m.name} <em>{mealFx(m, 1)}</em>
                </BuyRow>
                <p class="small">
                  {m.text}
                  {lv > 0 ? ` · ${mealFx(m, lv)} now` : ''}
                </p>
              </div>
            );
          })}
          <h3>The feast bell</h3>
          <p class="small">
            Every crop reaped fills it (a golden ear counts {FEAST.golden}). Ring it for {FEAST.seconds} s of
            every worker ×{FEAST.mult}, with crops growing ×{FEAST.grow}.
          </p>
          <div class="bar">
            <i style={{ width: `${on ? 100 : Math.min(100, (sf.feast / need) * 100)}%` }} />
          </div>
          <div class="row">
            <button
              class={`btn primary ${!on && sf.feast >= need ? 'can' : ''}`}
              disabled={on || sf.feast < need}
              onClick={() => ui.dispatch({ type: 'ringFeast' })}
            >
              {on ? `Feasting · ${left} s` : 'Ring the bell'}
            </button>
            <span class="small">{on ? '' : `${Math.min(sf.feast, need)} / ${need}`}</span>
            {!!s.helpers.tansy && (
              <label class="small check">
                <input
                  type="checkbox"
                  checked={sf.autoFeast}
                  onChange={(e) =>
                    ui.dispatch({ type: 'autoFeast', on: (e.target as HTMLInputElement).checked })
                  }
                />{' '}
                Tansy rings it when it’s full
              </label>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/** M6-07 act crops: the glowcap cellar (Act II), cress paddies (III) and pepper hot-beds (IV). canon §17.6 */
function ActCrops({ ui }: { ui: UiBridge }) {
  const s = ui.game.state;
  const sf = s.surface;
  const cc = cellarCost(s);
  const pumps = pumpsPlaced(s);
  const paddies = sf.plots.filter((p) => p.crop === 'cress').length;
  const hotbeds = sf.plots.filter((p) => p.crop === 'pepper').length;
  const dry = sf.plots.filter((p, i) => p.crop === 'cress' && !growing(s, i)).length;
  const pac = paddyCost(s);
  const hbc = hotbedCost(s);
  const showPaddy = paddies > 0 || pumps > 0;
  const showHot = hotbeds > 0 || hotbedsOffered(s);
  if (!cellarOffered(s) && !showPaddy && !showHot) return null;
  return (
    <>
      {cellarOffered(s) && (
        <section class="card" style={first(can(s, cc))}>
          <img class="prop" src={spriteURL('cellar', sf.cellar >= 2 ? 1 : 0)} alt="" />
          <div class="grow">
            <h3>The root cellar</h3>
            <Desc>
              {sf.cellar >= 2
                ? `Glowcaps grow in the dark under the cookhouse: a spore every ${ACT_CROPS.cellarEveryS} s for the Lamp-works.`
                : sf.cellar === 1
                  ? 'Dug and damp. Seed it with spores and it gives them back, one every few seconds.'
                  : 'Dig a cellar under the cookhouse and grow glowcaps there, so the Lamp-works never runs short of spores.'}
            </Desc>
            {cc && (
              <PriceButton s={s} costs={cc} onClick={() => ui.dispatch({ type: 'workCellar' })}>
                {sf.cellar === 0 ? 'Dig the cellar' : 'Seed it'}
              </PriceButton>
            )}
          </div>
        </section>
      )}
      {showPaddy && (
        <section class="card" style={first(can(s, pac))}>
          <img class="prop" src={spriteURL('crop-cress', 3)} alt="" />
          <div class="grow">
            <h3>
              Cress paddies · {paddies} · {fmt(s.res.cress)} cress
            </h3>
            <Desc>
              Flood a barley plot from the pumps and it grows cress for soup. Each pump in the mine waters{' '}
              {ACT_CROPS.paddiesPerPump} paddies ({pumps} pump{pumps === 1 ? '' : 's'} now).
            </Desc>
            {dry > 0 && <p class="small">{dry} stand dry: place more pumps to water them.</p>}
            {pac ? (
              <PriceButton
                s={s}
                costs={pac}
                onClick={() => ui.dispatch({ type: 'plantCrop', crop: 'cress' })}
              >
                Flood a plot
              </PriceButton>
            ) : (
              <p class="small">The pumps water every paddy they can.</p>
            )}
          </div>
        </section>
      )}
      {showHot && (
        <section class="card" style={first(can(s, hbc))}>
          <img class="prop" src={spriteURL('crop-pepper', 3)} alt="" />
          <div class="grow">
            <h3>
              Pepper hot-beds · {hotbeds} · {fmt(s.res.pepper)} peppers
            </h3>
            <Desc>
              Build a hot-bed on a barley plot and grow firepeppers for broth. Each harvest burns{' '}
              {ACT_CROPS.hotbedEmber} ember ore; with none in hand, the beds go cold and wait.
            </Desc>
            {hbc ? (
              <PriceButton
                s={s}
                costs={hbc}
                onClick={() => ui.dispatch({ type: 'plantCrop', crop: 'pepper' })}
              >
                Build a hot-bed
              </PriceButton>
            ) : (
              <p class="small">
                {hotbeds >= ACT_CROPS.maxHotbeds
                  ? 'All the hot-beds Tansy can tend.'
                  : 'No barley plot left to build on.'}
              </p>
            )}
          </div>
        </section>
      )}
    </>
  );
}

export function Woodlot({ ui }: { ui: UiBridge }) {
  const s = ui.game.state;
  const sf = s.surface;
  const sc = saplingCost(s);
  const trees = sf.trees.map((t) => (isElder(t) ? 'elder' : STAGE[treeStage(t)]!));
  return (
    <div class="shop">
      <section class="card" style={first(can(s, sc))}>
        <img class="prop" src={spriteURL('rook')} alt="" />
        <div class="grow">
          <h3>Rook’s woodlot · {fmt(s.res.timber)} timber</h3>
          <Desc>
            Trees grow young at {WOODLOT.stageS[0]! / 60} min, grown at {WOODLOT.stageS[1]! / 60} and old at{' '}
            {WOODLOT.stageS[2]! / 60}. Felling gives {WOODLOT.chop.slice(1).join(', ')} timber, double when
            you swing the axe: tap a tree. A tree that stands through {WOODLOT.elderAfter} Cave-ins becomes an
            elder.
          </Desc>
          <p class="small">{trees.length ? `Standing: ${trees.join(', ')}.` : 'The woodlot is bare.'}</p>
          {sc ? (
            <BuyRow ui={ui} of={{ k: 'sapling' }}>
              Plant a sapling
            </BuyRow>
          ) : (
            <p class="small">Every slot in the woodlot has a tree.</p>
          )}
        </div>
      </section>
      {WOOD_BUYS.map((b) => {
        const c = woodCost(s, b.id);
        const lv = sf.wood[b.id];
        return (
          <section class="card" style={first(can(s, c))} key={b.id}>
            <img class="prop" src={spriteURL(b.id === 'cottage' ? 'cottage' : 'forge', 1)} alt="" />
            <div class="grow">
              <h3>
                {b.name}
                {lv > 0 ? ` · ${lv}` : ''}
              </h3>
              <Desc>
                {b.text}: +{Math.round(b.per * 100)}% each
                {lv > 0 ? `, +${Math.round(b.per * lv * 100)}% now` : ''}.
              </Desc>
              {c ? (
                <BuyRow ui={ui} of={{ k: 'wood', id: b.id }}>
                  {b.id === 'cottage' ? 'Raise a cottage' : lv ? 'Stoke it higher' : 'Build the hearth'}
                </BuyRow>
              ) : (
                <p class="small">
                  {b.id === 'cottage' ? 'The valley has no room for more.' : 'As hot as it will burn.'}
                </p>
              )}
            </div>
          </section>
        );
      })}
      <p class="small">
        Pit props: once the Kiln is built, a support takes {PIT_PROP.n} timber in place of bricks while timber
        is the cheaper.
      </p>
    </div>
  );
}

const SOURCE: Record<TallySource, string> = {
  foreman: 'Your pick',
  miners: 'The miners, up the shaft',
  chests: 'Chests',
  fields: 'Tansy’s fields',
  woodlot: 'Rook’s woodlot',
};

/** M6-06: the cairn's stones (one per recent Cave-in) and the tally board of goods per second by source. */
export function CairnAndTally({ ui }: { ui: UiBridge }) {
  const s = ui.game.state;
  const runs = s.survey.filter((e) => e.hand === 'yours');
  const stones = runs.slice(-CAIRN.stones).map((e, i, a) => {
    const before = i > 0 ? a[i - 1] : runs[runs.length - a.length - 1];
    return { depth: e.depthFt, change: before ? e.depthFt - before.depthFt : null };
  });
  const rates = tallyRates(ui.game);
  const shown = TALLY_SOURCES.filter((k) => (rates?.[k] ?? 0) > 0);
  return (
    <section class="card">
      <img
        class="prop"
        src={spriteURL('cairn', Math.max(0, Math.min(runs.length, CAIRN.stones) - 1))}
        alt=""
      />
      <div class="grow">
        <h3>The tally board</h3>
        {!rates ? (
          <p class="small">Counting…</p>
        ) : shown.length ? (
          <table class="tally">
            <tbody>
              {shown.map((k) => (
                <tr key={k}>
                  <td>{SOURCE[k]}</td>
                  <td>{fmt(D(rates[k]))}/s</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p class="small">Nothing has come in this last minute.</p>
        )}
        {stones.length > 0 && (
          <>
            <h3>The cairn</h3>
            <p class="small">One stone for each Cave-in, marked with how deep that dig went.</p>
            <table class="tally">
              <tbody>
                {stones.map((st, i) => (
                  <tr key={i}>
                    <td>{fmt(D(st.depth))} ft</td>
                    <td>
                      {st.change === null
                        ? 'the first'
                        : st.change === 0
                          ? 'as deep as the last'
                          : `${st.change > 0 ? '+' : '−'}${fmt(D(Math.abs(st.change)))} ft on the last`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}

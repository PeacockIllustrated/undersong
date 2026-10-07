// The HUD and menus. Reads the game, dispatches actions; never mutates state directly.
import { useEffect, useState } from 'preact/hooks';
import { BIOMES, BIOME_BAND, biomeAt } from '../data/biomes';
import { BIOME_LINES } from '../story/biomes';
import { SKY_ROWS, ftFromDepthTiles } from '../data/constants';
import { RES_KEYS, type ResKey } from '../data/resources';
import type { Action, Tool } from '../sim/actions';
import type { Game } from '../sim/game';
import type { GameState } from '../sim/state';
import type { AwaySummary } from '../save/offline';
import { spriteURL } from '../render/sprites';
import { fmt, mult } from './format';
import { rushMult } from '../sim/dig';
import { rushStep } from '../sim/power';
import { VillageSheet, villageFocus, villageTab, type VillageTab } from './Village';
import { SurveyBook } from './SurveyBook';
import { CartSheet } from './Cart';
import { CART_UI } from '../story/finds';
import { MenuSheet } from './Menu';
import { useApplySettings } from './Settings';
import { AchievementToasts } from './Achievements';
import { EndingChoice, StoryLayer, TipStrip } from './Story';
import { AwaySheet } from './Away';
import { lanterns } from '../sim/village';
import { homecoming, homeUntilD } from '../sim/power';
import { ResChips } from './ResChips';
import { EdgeMarkers } from './EdgeMarkers';
import { HoverLabel } from './HoverLabel';
import { DepthRuler } from './DepthRuler';
import { FEAST, FIELDS } from '../data/surface';
import { feasting, ripe } from '../sim/surface';
import { bottleneck, echoAffordable, villageAffordable, type Fix } from './feedback';

export interface UiBridge {
  readonly game: Game;
  dispatch(a: Action): void;
  save(): void;
  replace(s: GameState | null): void;
  wipe(): void;
  recenter(): void;
  /** Move the camera to a tile and stop following the Foreman. */
  lookAt(x: number, y: number): void;
  /** A tile's centre in CSS px, and the view's CSS size, for markers drawn over the canvas. */
  toScreen(x: number, y: number): { x: number; y: number; w: number; h: number };
  tool: Tool;
  setTool(t: Tool): void;
  /** What the village did while the player was away, until they close the summary. */
  readonly away: AwaySummary | null;
  clearAway(): void;
  /** M7-03: the tile under an idle mouse, and since when (performance.now ms). Never set by touch. */
  readonly hover: { x: number; y: number; t0: number } | null;
  /** M7-05: the whole mountain as a map, instead of the close view. */
  readonly mountain: boolean;
  setMountain(on: boolean): void;
}

/** Big centre-screen announcements (ADR-020), one at a time, each for a couple of seconds. */
function Toasts() {
  const [q, setQ] = useState<{ big: string; sub: string; id: number }[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event): void => {
      const d = (e as CustomEvent<{ big: string; sub: string }>).detail;
      setQ((x) => [...x.slice(-2), { ...d, id: ++n }]);
    };
    window.addEventListener('undersong:toast', on);
    return () => window.removeEventListener('undersong:toast', on);
  }, []);
  const t = q[0];
  useEffect(() => {
    if (!t) return;
    const id = window.setTimeout(() => setQ((x) => x.slice(1)), 2200);
    return () => window.clearTimeout(id);
  }, [t?.id]);
  if (!t) return null;
  return (
    <div class="bigtoast" key={t.id} aria-live="polite">
      <div class="big">{t.big}</div>
      {t.sub && <div class="sub">{t.sub}</div>}
    </div>
  );
}

/** Polish item 5: a wide banner the first time a run reaches each biome; a plain toast on later visits. */
function BiomeBanner() {
  const [b, setB] = useState<{ id: number; key: number } | null>(null);
  useEffect(() => {
    let n = 0;
    const on = (e: Event): void => setB({ id: (e as CustomEvent<number>).detail, key: ++n });
    window.addEventListener('undersong:biome', on);
    return () => window.removeEventListener('undersong:biome', on);
  }, []);
  useEffect(() => {
    if (!b) return;
    const id = window.setTimeout(() => setB(null), 3500);
    return () => window.clearTimeout(id);
  }, [b?.key]);
  if (!b) return null;
  const def = BIOMES[b.id]!;
  return (
    <button class="panel biome-banner" key={b.key} onClick={() => setB(null)} aria-live="polite">
      <div class="act">
        Act {def.act} · {ftFromDepthTiles(def.d0)} ft
      </div>
      <div class="name">{def.name}</div>
      {BIOME_LINES[b.id] && <div class="line">{BIOME_LINES[b.id]}</div>}
    </button>
  );
}

function lumenOut(ui: UiBridge): boolean {
  return !ui.game.world.lanternsLit && lanterns(ui.game).length > 0;
}

export type Sheet = null | 'village' | 'survey' | 'menu' | 'cart';

function useTick(ms: number): void {
  const [, set] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => set((n) => n + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

/** Resources shown on the HUD, in this order, when the player has any. */

export function App({ ui }: { ui: UiBridge }) {
  useTick(200);
  const [sheet, setSheet] = useState<Sheet>(null);
  useApplySettings();
  const [toolsOpen, setToolsOpen] = useState(false);
  // M7-06: Escape closes the open sheet first; only with nothing open does it reach the dig queue (main.ts)
  useEffect(() => {
    if (!sheet) return undefined;
    const on = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      setSheet(null);
    };
    window.addEventListener('keydown', on, true);
    return () => window.removeEventListener('keydown', on, true);
  }, [sheet]);
  const g = ui.game;
  const s = g.state;
  const d = g.world.depth(s.foreman.y);
  const biome = biomeAt(d);
  const wide = window.innerWidth > 600;
  const home = homecoming(s);
  const neck = bottleneck(g);
  const newInVillage = villageAffordable(g);
  const newInSurvey = echoAffordable(g) || s.stats.firsts.caveInReady !== undefined;
  const moths = s.pests.filter((p) => p.kind === 'moth');
  const beetles = s.pests.filter((p) => p.kind === 'beetle');
  const eels = s.pests.filter((p) => p.kind === 'eel');
  const golems = s.pests.filter((p) => p.kind === 'golem');
  const ripeN = ripe(s);
  /** M8-06: an alert takes you to its fix. */
  const goFix = (f: Fix): void => {
    if ('card' in f) {
      villageFocus(f.card);
      setSheet('village');
    } else ui.lookAt(f.x, f.y);
  };
  /** M6-01: pan up to the grass line over the fields; ⌖ comes back down. */
  const lookUp = (): void => {
    const x = FIELDS.plotX0 + Math.max(0, Math.min(s.surface.plots.length, 8) - 1) / 2;
    ui.lookAt(Math.round(x), (ui.game.world.surf[Math.round(x)] ?? SKY_ROWS) - 2);
  };
  const wisps = s.pests.filter((p) => p.kind === 'wisp');
  const golemStopped = s.miners.filter((m) => golems.some((p) => p.id === m.stalledBy)).length;
  const tools: { id: Tool; sprite: string; label: string; stock?: ResKey; show: boolean; title: string }[] = [
    {
      id: 'torch',
      sprite: 'obj-torch',
      label: 'Torch',
      stock: 'torch',
      show: true,
      title: 'Tap open ground to place a torch; tap a torch to pick it up',
    },
    {
      id: 'lantern',
      sprite: 'obj-lantern',
      label: 'Lantern',
      stock: 'lantern',
      show: s.buildings.lampworks > 0 || s.res.lantern.gt(0),
      title: 'Tap open ground to hang a lantern; tap a lantern to take it down',
    },
    {
      id: 'support',
      sprite: 'obj-support',
      label: 'Support',
      stock: 'support',
      show: s.buildings.kiln > 0 || s.res.support.gt(0),
      title: 'Tap open ground to prop the roof; supports stop collapses nearby',
    },
    {
      id: 'pump',
      sprite: 'obj-pump',
      label: 'Pump',
      stock: 'pump',
      show: s.stats.firsts.halls !== undefined || s.res.pump.gt(0),
      title: 'Tap open ground at the water’s edge to set a pump; tap a pump to take it up',
    },
    {
      id: 'vent',
      sprite: 'obj-vent',
      label: 'Vent',
      stock: 'vent',
      show: s.stats.firsts.ember !== undefined || s.res.vent.gt(0),
      title: 'Tap open ground by a hot face to set a cooling vent; tap a vent to take it up',
    },
  ];
  void RES_KEYS;

  // a tip's "Show me" opens the Village on its tab
  useEffect(() => {
    const onV = (e: Event): void => {
      villageTab((e as CustomEvent<VillageTab>).detail);
      setSheet('village');
    };
    window.addEventListener('undersong:village', onV);
    return () => window.removeEventListener('undersong:village', onV);
  }, []);

  // the Cave-in opens the Survey Book once its collapse has played
  useEffect(() => {
    const onCave = (): void => setSheet('survey');
    window.addEventListener('undersong:cavein-done', onCave);
    return () => window.removeEventListener('undersong:cavein-done', onCave);
  }, []);

  const pickSprite =
    [
      'pick-wood',
      'pick-copper',
      'pick-bronze',
      'pick-iron',
      'pick-silver',
      'pick-aqua',
      'pick-crystal',
      'pick-ember',
      'pick-heart',
    ][s.pickTier] ?? 'pick-wood';
  const toolList: { id: Tool; sprite: string; label: string; stock?: ResKey; title: string }[] = [
    { id: 'dig', sprite: pickSprite, label: 'Dig', title: 'Dig' },
    ...tools.filter((t) => t.show),
  ];
  // NEW until first placed (this run's firsts covers saves from before the flag existed)
  const usedTool = (id: Tool): boolean =>
    s.story.ever.includes(`used:${id}`) || s.stats.firsts[id] !== undefined;
  const cur = toolList.find((t) => t.id === ui.tool) ?? toolList[0]!;

  const mountainBtn = (extra: string) => (
    <button
      class={`btn ibtn ${extra} ${ui.mountain ? 'primary' : ''}`}
      onClick={() => ui.setMountain(!ui.mountain)}
      aria-label="See the whole mountain"
      aria-pressed={ui.mountain}
      title="The whole mountain (tap the map to go there)"
    >
      <img src={spriteURL('icon-mountain')} alt="" />
      <span class="il">Mountain</span>
    </button>
  );

  return (
    <>
      <div class="hud-top">
        <div class="hud-left">
          <div
            class="panel depth"
            aria-live="polite"
            style={d >= 1 && BIOME_BAND[biome.id] ? { borderLeftColor: BIOME_BAND[biome.id] } : undefined}
          >
            <div class="ft">{ftFromDepthTiles(d)} ft</div>
            <div class="biome">
              <span class="bname">{d < 1 ? 'Holloway' : biome.name} · </span>deepest{' '}
              {ftFromDepthTiles(s.stats.maxDepthD)} ft
            </div>
            {s.foreman.chain > 0 && (
              <div class="rush">Vein Rush ×{mult(rushMult(s.foreman.chain, rushStep(s)))}</div>
            )}
            {home > 1 && (
              <div class="home" title="After a Cave-in the village remembers the way down">
                Homecoming ×{home} · until {ftFromDepthTiles(homeUntilD(s))} ft
              </div>
            )}
            {feasting(s) && (
              <div class="home" title="The feast bell rang: every worker is doubled">
                Feast ×{FEAST.mult} · {Math.ceil((s.surface.feastUntil - s.t) / 1000)} s
              </div>
            )}
            {neck && (
              <button class="neck" title={neck.hint} onClick={() => goFix(neck.fix)}>
                Held back by: {neck.what} ›
              </button>
            )}
          </div>
          {s.pests.length > 0 && (
            <button
              class="panel alert"
              style={{ pointerEvents: 'auto' }}
              onClick={() => {
                const p = golems[0] ?? wisps[0] ?? eels[0] ?? beetles[0] ?? s.pests[0]!;
                ui.lookAt(p.x, p.y);
              }}
            >
              {golems.length > 0
                ? `Shard golem · ${golemStopped} miner${golemStopped === 1 ? '' : 's'} stopped. Tap it ${golems[0]!.hp ?? 1} more time${(golems[0]!.hp ?? 1) > 1 ? 's' : ''}.`
                : wisps.length > 0
                  ? `Cinder wisps · ${wisps.length} miner${wisps.length > 1 ? 's' : ''} stopped.`
                  : eels.length > 0
                    ? `Eels · ${eels.length} miner${eels.length > 1 ? 's' : ''} bitten.`
                    : beetles.length > 0
                      ? `Beetles · ${beetles.length} miner${beetles.length > 1 ? 's' : ''} stopped.`
                      : `Moths · ${moths.length} lantern${moths.length > 1 ? 's' : ''} dimmed.`}{' '}
              Show me
            </button>
          )}
          {ripeN > 0 && !s.helpers.tansy && (
            <button class="panel alert crop" style={{ pointerEvents: 'auto' }} onClick={lookUp}>
              <img src={spriteURL('barley')} alt="" /> {ripeN} ripe · reap
            </button>
          )}
          {s.cart.offers && (
            <button class="panel alert cart-alert" onClick={() => setSheet('cart')}>
              <img src={spriteURL('cart')} alt="" /> {CART_UI.here} ›
            </button>
          )}
          {lumenOut(ui) && (
            <button class="panel alert dark" onClick={() => goFix({ card: 'lampworks' })}>
              Out of Lumen · the lanterns are dark ›
            </button>
          )}
          {!sheet && !ui.mountain && (
            <div class="tip-slot">
              <TipStrip ui={ui} />
            </div>
          )}
        </div>
        <ResChips s={s} biome={biome.id} wide={wide} />
      </div>
      {ui.away && <AwaySheet ui={ui} />}
      <StoryLayer ui={ui} />
      <EndingChoice ui={ui} />
      <Toasts />
      <BiomeBanner />
      {!wide && !sheet && mountainBtn('panel mtn-float')}
      {!sheet && !ui.mountain && <EdgeMarkers ui={ui} />}
      {!sheet && !ui.mountain && <HoverLabel ui={ui} />}
      {!sheet && !ui.mountain && <DepthRuler ui={ui} />}
      {(s.foreman.queue.length > 0 || s.foreman.target) && (
        <button
          class="panel qchip"
          title="Stop digging (Esc). Tap a queued tile, or drag across several, to cancel just those."
          onClick={() => ui.dispatch({ type: 'cancelDig' })}
        >
          Clear queue · {s.foreman.queue.length + (s.foreman.target ? 1 : 0)}
        </button>
      )}
      <div class="hud-bottom">
        {wide || toolsOpen ? (
          <div class={`tools panel ${wide ? '' : 'pop'}`} role="group" aria-label="Tool">
            {toolList.map((t) => (
              <button
                key={t.id}
                class={`tool ${ui.tool === t.id ? 'on' : ''}`}
                aria-pressed={ui.tool === t.id}
                onClick={() => {
                  ui.setTool(t.id !== 'dig' && ui.tool === t.id ? 'dig' : t.id);
                  setToolsOpen(false);
                }}
                title={t.title}
              >
                <img src={spriteURL(t.sprite)} alt="" />
                <span class="tl">{t.label}</span> {t.stock ? fmt(s.res[t.stock]) : ''}
                {t.id !== 'dig' && !usedTool(t.id) && <span class="pip">NEW</span>}
              </button>
            ))}
          </div>
        ) : null}
        {!wide && (
          <button
            class="panel tool current on"
            aria-expanded={toolsOpen}
            aria-label={`Tool: ${cur.label}. Change tool`}
            onClick={() => setToolsOpen(!toolsOpen)}
          >
            <img src={spriteURL(cur.sprite)} alt="" />
            {cur.stock ? fmt(s.res[cur.stock]) : ''}
            {toolList.length > 1 && <span class="caret">{toolsOpen ? '▾' : '▴'}</span>}
            {!toolsOpen && toolList.some((t) => t.id !== 'dig' && !usedTool(t.id)) && (
              <span class="pip">NEW</span>
            )}
          </button>
        )}
        <div class="row nav">
          <button
            class="btn ibtn"
            onClick={() => ui.recenter()}
            aria-label="Follow the Foreman"
            title="Follow the Foreman"
          >
            <img src={spriteURL('icon-follow')} alt="" />
            <span class="il">Foreman</span>
          </button>
          {s.surface.tansy && (
            <button class="btn ibtn" onClick={lookUp} aria-label="Look up at the fields" title="Look up">
              <img src={spriteURL('barley')} alt="" />
              <span class="il">Fields</span>
            </button>
          )}
          {wide && mountainBtn('')}
          <button
            class={`btn ${sheet === 'village' ? 'primary' : ''} ${newInVillage && sheet !== 'village' ? 'new' : ''}`}
            onClick={() => setSheet(sheet === 'village' ? null : 'village')}
          >
            Village
          </button>
          <button
            class={`btn ${sheet === 'survey' ? 'primary' : ''} ${newInSurvey ? 'glow' : ''}`}
            onClick={() => setSheet(sheet === 'survey' ? null : 'survey')}
          >
            Survey
          </button>
          <button class="btn ibtn" onClick={() => setSheet('menu')} aria-label="Menu" title="Menu">
            <img src={spriteURL('icon-menu')} alt="" />
            <span class="il">Menu</span>
          </button>
        </div>
      </div>
      <AchievementToasts s={s} />
      {sheet === 'village' && <VillageSheet ui={ui} close={() => setSheet(null)} />}
      {sheet === 'survey' && <SurveyBook ui={ui} close={() => setSheet(null)} />}
      {sheet === 'cart' && <CartSheet ui={ui} close={() => setSheet(null)} />}
      {sheet === 'menu' && <MenuSheet ui={ui} close={() => setSheet(null)} />}
    </>
  );
}

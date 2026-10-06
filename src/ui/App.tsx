// The HUD and menus. Reads the game, dispatches actions; never mutates state directly.
import { useEffect, useState } from 'preact/hooks';
import { BIOMES, biomeAt } from '../data/biomes';
import { BIOME_LINES } from '../story/biomes';
import { ftFromDepthTiles } from '../data/constants';
import { RES_KEYS, type ResKey } from '../data/resources';
import type { Action, Tool } from '../sim/actions';
import type { Game } from '../sim/game';
import type { GameState } from '../sim/state';
import type { AwaySummary } from '../save/offline';
import { spriteURL } from '../render/sprites';
import { fmt } from './format';
import { VillageSheet, villageTab, type VillageTab } from './Village';
import { SurveyBook } from './SurveyBook';
import { MenuSheet } from './Menu';
import { StoryLayer } from './Story';
import { AwaySheet } from './Away';
import { lanterns } from '../sim/village';
import { homecoming, homeUntilD } from '../sim/power';
import { ResChips } from './ResChips';
import { EdgeMarkers } from './EdgeMarkers';
import { DepthRuler } from './DepthRuler';
import { bottleneck, echoAffordable, villageAffordable } from './feedback';

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

export type Sheet = null | 'village' | 'survey' | 'menu';

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
  const [toolsOpen, setToolsOpen] = useState(false);
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

  return (
    <>
      <div class="hud-top">
        <div class="hud-left">
          <div class="panel depth" aria-live="polite">
            <div class="ft">{ftFromDepthTiles(d)} ft</div>
            <div class="biome">
              {d < 1 ? 'Holloway' : biome.name} · deepest {ftFromDepthTiles(s.stats.maxDepthD)} ft
            </div>
            {s.foreman.chain > 0 && (
              <div class="rush">Vein Rush ×{(1 + 0.25 * s.foreman.chain).toFixed(2).replace(/0$/, '')}</div>
            )}
            {home > 1 && (
              <div class="home" title="After a Cave-in the village remembers the way down">
                Homecoming ×{home} · until {ftFromDepthTiles(homeUntilD(s))} ft
              </div>
            )}
            {neck && (
              <div class="neck" title={neck.hint}>
                Held back by: {neck.what}
              </div>
            )}
          </div>
          {s.pests.length > 0 && (
            <button
              class="panel alert"
              style={{ pointerEvents: 'auto' }}
              onClick={() => {
                const p = golems[0] ?? eels[0] ?? beetles[0] ?? s.pests[0]!;
                ui.lookAt(p.x, p.y);
              }}
            >
              {golems.length > 0
                ? `Shard golem · ${golemStopped} miner${golemStopped === 1 ? '' : 's'} stopped. Tap it ${golems[0]!.hp ?? 1} more time${(golems[0]!.hp ?? 1) > 1 ? 's' : ''}.`
                : eels.length > 0
                  ? `Eels · ${eels.length} miner${eels.length > 1 ? 's' : ''} bitten.`
                  : beetles.length > 0
                    ? `Beetles · ${beetles.length} miner${beetles.length > 1 ? 's' : ''} stopped.`
                    : `Moths · ${moths.length} lantern${moths.length > 1 ? 's' : ''} dimmed.`}{' '}
              Show me
            </button>
          )}
          {lumenOut(ui) && <div class="panel alert dark">Out of Lumen · the lanterns are dark</div>}
        </div>
        <ResChips s={s} biome={biome.id} wide={wide} />
      </div>
      {ui.away && <AwaySheet ui={ui} />}
      <StoryLayer ui={ui} tips={!sheet} />
      <Toasts />
      <BiomeBanner />
      {!sheet && <EdgeMarkers ui={ui} />}
      {!sheet && <DepthRuler ui={ui} />}
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
          <button class="btn" onClick={() => ui.recenter()} aria-label="Follow the Foreman">
            ⌖
          </button>
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
          <button class="btn" onClick={() => setSheet('menu')} aria-label="Menu">
            ☰
          </button>
        </div>
      </div>
      {sheet === 'village' && <VillageSheet ui={ui} close={() => setSheet(null)} />}
      {sheet === 'survey' && <SurveyBook ui={ui} close={() => setSheet(null)} />}
      {sheet === 'menu' && <MenuSheet ui={ui} close={() => setSheet(null)} />}
    </>
  );
}

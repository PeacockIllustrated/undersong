// The HUD and menus. Reads the game, dispatches actions; never mutates state directly.
import { useEffect, useState } from 'preact/hooks';
import { biomeAt } from '../data/biomes';
import { ftFromDepthTiles } from '../data/constants';
import { RES_KEYS, RES_NAMES, type ResKey } from '../data/resources';
import type { Action, Tool } from '../sim/actions';
import type { Game } from '../sim/game';
import type { GameState } from '../sim/state';
import { spriteURL } from '../render/sprites';
import { RES_ICON } from './icons';
import { fmt } from './format';
import { VillageSheet } from './Village';
import { SurveyBook } from './SurveyBook';
import { MenuSheet } from './Menu';
import { StoryLayer } from './Story';

export interface UiBridge {
  readonly game: Game;
  dispatch(a: Action): void;
  save(): void;
  replace(s: GameState | null): void;
  wipe(): void;
  recenter(): void;
  /** Move the camera to a tile and stop following the Foreman. */
  lookAt(x: number, y: number): void;
  tool: Tool;
  setTool(t: Tool): void;
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
const HUD_ORDER: readonly ResKey[] = [
  'copperBar',
  'tinBar',
  'bronzeBar',
  'ironBar',
  'silverBar',
  'goldBar',
  'copperOre',
  'tinOre',
  'ironOre',
  'silverOre',
  'aquamarine',
  'crystal',
  'emberOre',
  'goldOre',
  'heartstone',
  'spores',
  'lumen',
  'brick',
];

export function App({ ui }: { ui: UiBridge }) {
  useTick(200);
  const [sheet, setSheet] = useState<Sheet>(null);
  const g = ui.game;
  const s = g.state;
  const d = g.world.depth(s.foreman.y);
  const biome = biomeAt(d);
  const held = HUD_ORDER.filter((k) => s.res[k].gt(0));
  void RES_KEYS;

  // the Cave-in opens the Survey Book once its collapse has played
  useEffect(() => {
    const onCave = (): void => setSheet('survey');
    window.addEventListener('undersong:cavein-done', onCave);
    return () => window.removeEventListener('undersong:cavein-done', onCave);
  }, []);

  return (
    <>
      <div class="hud-top">
        <div class="panel depth" aria-live="polite">
          <div class="ft">{ftFromDepthTiles(d)} ft</div>
          <div class="biome">
            {d < 1 ? 'Holloway' : biome.name} · deepest {ftFromDepthTiles(s.stats.maxDepthD)} ft
          </div>
          {s.foreman.chain > 0 && (
            <div class="rush">Vein Rush ×{(1 + 0.25 * s.foreman.chain).toFixed(2).replace(/0$/, '')}</div>
          )}
        </div>
        <div class="res">
          {s.echoes.gt(0) && (
            <div class="panel chip echo" title="Echoes">
              <img src={spriteURL('echo')} alt="" />
              {fmt(s.echoes)}
            </div>
          )}
          {held.map((k) => (
            <div class="panel chip" key={k} title={RES_NAMES[k]}>
              <img src={spriteURL(RES_ICON[k])} alt="" />
              {fmt(s.res[k])}
            </div>
          ))}
        </div>
      </div>
      {s.pests.length > 0 && (
        <button
          class="panel alert"
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 92px)',
            left: '10px',
            pointerEvents: 'auto',
          }}
          onClick={() => ui.lookAt(s.pests[0]!.x, s.pests[0]!.y)}
        >
          Beetles · {s.pests.length} miner{s.pests.length > 1 ? 's' : ''} stopped. Show me
        </button>
      )}
      <StoryLayer ui={ui} />
      <div class="hud-bottom">
        <div class="tools panel" role="group" aria-label="Tool">
          <button
            class={`tool ${ui.tool === 'dig' ? 'on' : ''}`}
            aria-pressed={ui.tool === 'dig'}
            onClick={() => ui.setTool('dig')}
          >
            <img
              src={spriteURL(
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
                ][s.pickTier] ?? 'pick-wood',
              )}
              alt=""
            />
            Dig
          </button>
          <button
            class={`tool ${ui.tool === 'torch' ? 'on' : ''}`}
            aria-pressed={ui.tool === 'torch'}
            onClick={() => ui.setTool('torch')}
            title="Tap open ground to place a torch; tap a torch to pick it up"
          >
            <img src={spriteURL('obj-torch')} alt="" />
            Torch {fmt(s.res.torch)}
          </button>
        </div>
        <div class="row nav">
          <button class="btn" onClick={() => ui.recenter()} aria-label="Follow the Foreman">
            ⌖
          </button>
          <button
            class={`btn ${sheet === 'village' ? 'primary' : ''}`}
            onClick={() => setSheet(sheet === 'village' ? null : 'village')}
          >
            Village
          </button>
          <button
            class={`btn ${sheet === 'survey' ? 'primary' : ''} ${s.stats.firsts.caveInReady !== undefined ? 'glow' : ''}`}
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

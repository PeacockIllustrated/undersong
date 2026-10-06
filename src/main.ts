// Boot: load or start a game, run the fixed-step loop, draw, save. dev-bible §1.3
import { render, h } from 'preact';
import { AUTOSAVE_MS, MAX_TICKS_PER_FRAME, SHAFT_X, SKY_ROWS, TICK_MS, TILE_PX } from './data/constants';
import { MATERIALS, isMineable } from './data/materials';
import { apply, type Action } from './sim/actions';
import { createGame, loadGame, type Game } from './sim/game';
import { step } from './sim/step';
import { loadSprites } from './render/sprites';
import { buildTileTextures } from './render/tiles';
import { Renderer } from './render/renderer';
import { Camera } from './render/camera';
import { Input } from './render/input';
import { loadLocal, saveLocal, wipeLocal } from './save/storage';
import { App, type UiBridge } from './ui/App';
import { Atlas } from './ui/Atlas';
import type { GameState } from './sim/state';
import './ui/style.css';

loadSprites();
buildTileTextures();

const uiRoot = document.getElementById('ui')!;

if (location.hash === '#atlas') {
  document.body.classList.add('atlas');
  render(h(Atlas, {}), uiRoot);
} else boot();

function newSeed(): number {
  return (Math.floor(Math.random() * 0x7fffffff) ^ Date.now()) >>> 0;
}

function boot(): void {
  const saved = loadLocal();
  const game: { g: Game } = { g: saved ? loadGame(saved) : createGame(newSeed()) };
  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const renderer = new Renderer(canvas);
  const cam = new Camera();
  let following = true;

  const fit = (): void => {
    renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  };
  fit();
  window.addEventListener('resize', fit);
  cam.centerOn(SHAFT_X * TILE_PX, (SKY_ROWS + 2) * TILE_PX, renderer.viewW, renderer.viewH);

  const dispatch = (a: Action): void => apply(game.g, a);

  const input = new Input(canvas, cam, {
    scale: () => renderer.scale,
    isDiggable: (x, y) => ui.tool === 'dig' && isMineable(game.g.world.get(x, y)),
    onTap: (x, y) => {
      if (ui.tool === 'dig') following = true;
      dispatch({ type: 'tap', x, y, tool: ui.tool });
    },
    onPath: (tiles) => {
      following = true;
      dispatch({ type: 'digPath', tiles });
    },
    onPan: () => {
      following = false;
    },
  });

  const save = (): void => saveLocal(game.g.state, Date.now());
  const replace = (s: GameState | null): void => {
    game.g = s ? loadGame(s) : createGame(newSeed());
    renderer.invalidate();
    save();
  };
  window.setInterval(save, AUTOSAVE_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });
  window.addEventListener('beforeunload', save);

  const ui: UiBridge = {
    get game() {
      return game.g;
    },
    dispatch,
    save,
    replace,
    wipe: () => {
      wipeLocal();
      replace(null);
    },
    recenter: () => {
      following = true;
    },
    lookAt(x, y) {
      following = false;
      cam.centerOn(x * TILE_PX + TILE_PX / 2, y * TILE_PX, renderer.viewW, renderer.viewH);
    },
    tool: 'dig',
    setTool(t) {
      this.tool = t;
      canvas.style.cursor = t === 'torch' ? 'cell' : 'crosshair';
    },
  };
  render(h(App, { ui }), uiRoot);

  // Rolling average draw time in ms, readable from devtools as window.undersongPerf.
  const perf = { draw: 0 };
  (window as unknown as { undersongPerf: typeof perf }).undersongPerf = perf;
  let acc = 0;
  let last = performance.now();
  const frame = (now: number): void => {
    const dt = Math.min(1000, now - last);
    last = now;
    acc += dt;
    let n = 0;
    while (acc >= TICK_MS && n < MAX_TICKS_PER_FRAME) {
      step(game.g, TICK_MS);
      acc -= TICK_MS;
      n++;
    }
    if (n === MAX_TICKS_PER_FRAME) acc = 0;
    handleEvents(game.g, renderer, now);
    input.update(dt / 1000);
    if (following) {
      const f = game.g.state.foreman;
      cam.glide(f.x * TILE_PX + TILE_PX / 2, f.y * TILE_PX, renderer.viewW, renderer.viewH, dt / 1000);
    }
    cam.clamp(game.g.world.w, game.g.world.h, renderer.viewW, renderer.viewH);
    renderer.preview = input.mode === 'dig' ? input.path : [];
    const t0 = performance.now();
    renderer.draw(game.g, cam, now);
    perf.draw = perf.draw * 0.95 + (performance.now() - t0) * 0.05;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function handleEvents(g: Game, r: Renderer, now: number): void {
  for (const e of g.events) {
    if (e.kind === 'mined') {
      const def = MATERIALS[e.m];
      const host = def?.host !== undefined ? MATERIALS[def.host] : def;
      if (host) r.fx.debris(e.x * TILE_PX + 8, e.y * TILE_PX + 8, host.ramp, 7);
    } else if (e.kind === 'drop') {
      r.fx.float(e.x * TILE_PX + 8, e.y * TILE_PX + 2, `+${e.n}`, '#FFD65A', now);
    } else if (e.kind === 'refused') {
      r.fx.shake(1, 160, now);
      r.refused = { x: e.x, y: e.y, until: now + 300 };
    } else if (e.kind === 'pest') {
      if (e.cleared) r.fx.debris(e.x * TILE_PX + 8, e.y * TILE_PX + 10, ['#373A52', '#5F6487', '#141A33'], 6);
    } else if (e.kind === 'chest') {
      for (let i = 0; i < 6; i++) r.fx.sparkle(e.x * TILE_PX + 8, e.y * TILE_PX + 4, '#FFD65A');
    } else if (e.kind === 'verse') {
      r.fx.shake(1, 300, now);
      for (let i = 0; i < 14; i++)
        r.fx.sparkle(e.x * TILE_PX + 8, e.y * TILE_PX + 8, i % 2 ? '#FFF2A8' : '#FFD65A');
    } else if (e.kind === 'rush') {
      r.fx.float(
        e.x * TILE_PX + 8,
        e.y * TILE_PX - 4,
        `×${e.mult.toFixed(2).replace(/0$/, '')}`,
        '#5FF0D8',
        now,
      );
    } else if (e.kind === 'caveIn') {
      r.invalidate();
      r.fx.shake(3, 1500, now);
    }
  }
  g.events.length = 0;
}

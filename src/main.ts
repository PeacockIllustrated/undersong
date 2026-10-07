// Boot: load or start a game, run the fixed-step loop, draw, save. dev-bible §1.3
import { DEEP_PICK } from './data/beyond';
import { markerD } from './sim/beyond';
import { AUTO_TEXT, DEEP_PICK_TEXT, MARKER_TEXT } from './story/beyond';
import { render, h } from 'preact';
import {
  AUTOSAVE_MS,
  FT_PER_TILE,
  MAX_TICKS_PER_FRAME,
  SHAFT_X,
  SKY_ROWS,
  TICK_MS,
  TILE_PX,
} from './data/constants';
import { MATERIALS, isMineable } from './data/materials';
import { apply, queued, type Action } from './sim/actions';
import { createGame, loadGame, type Game } from './sim/game';
import { snapToOre, veinTiles } from './sim/smartdig';
import { workable } from './sim/reach';
import { settings } from './settings';
import { step } from './sim/step';
import { loadSprites } from './render/sprites';
import { buildTileTextures } from './render/tiles';
import { Renderer } from './render/renderer';
import { Camera } from './render/camera';
import { HOLD_MS, Input, buzz } from './render/input';
import { HAPTICS } from './data/touch';
import { sampleRates } from './ui/rates';
import { loadLocal, saveLocal, wipeLocal } from './save/storage';
import { catchUp } from './save/offline';
import { App, type UiBridge } from './ui/App';
import { Atlas } from './ui/Atlas';
import type { GameState } from './sim/state';
import { BUILDINGS, HAULS, METALWORK, WHETSTONE } from './data/economy';
import { metalFx } from './story/shop';
import { PICKS } from './data/items';
import { BIOMES, biomeAt } from './data/biomes';
import { HELPERS } from './data/helpers';
import { ACT_CROPS, FEAST, FIELDS, MEALS, WOOD_BUYS } from './data/surface';
import { mealFx } from './ui/Surface';
import { toast } from './ui/feedback';
import { Ears } from './audio/ears';
import { SETTINGS_TEXT } from './story/settings';
import { aheadText } from './story/memory';
import { CART_TEXT, CART_UI, CURIO_TEXT, CURIO_UI, DOG_TEXT, RAIN_TEXT } from './story/finds';
import { CURIOS } from './data/finds';
import { RES_NAMES } from './data/resources';
import { RES_ICON } from './ui/icons';
import type { ResKey } from './data/resources';
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
  // canon §4.8: the village kept digging while the page was closed
  let away = saved && saved.savedAt > 0 ? catchUp(game.g, Date.now() - saved.savedAt) : null;
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
    onTap: (x, y, touch) => {
      if (ui.tool === 'dig') following = true;
      // M7-02: a finger's tap beside ore digs the ore; so does a click on rock that can't be dug yet
      if (
        ui.tool === 'dig' &&
        settings().smartDig &&
        !queued(game.g, x, y) &&
        (touch || !workable(game.g, x, y))
      )
        ({ x, y } = snapToOre(game.g, x, y));
      dispatch({ type: 'tap', x, y, tool: ui.tool });
    },
    isOre: (x, y) => ui.tool === 'dig' && !!MATERIALS[game.g.world.get(x, y)]?.isOre,
    onVein: (x, y) => {
      following = true;
      const tiles = veinTiles(game.g, x, y);
      if (tiles.length) dispatch({ type: 'digPath', tiles });
    },
    onPath: (tiles) => {
      following = true;
      // a drag that starts on a queued tile cancels the queued tiles it crosses
      const t0 = tiles[0]!;
      if (queued(game.g, t0.x, t0.y)) dispatch({ type: 'unqueue', tiles });
      else dispatch({ type: 'digPath', tiles });
    },
    onPan: () => {
      following = false;
    },
    onZoom: (dir) => {
      // M7-05: zooming in from the Mountain view goes back to the close view; otherwise keep the centre still
      if (renderer.mountain) {
        if (dir === 1) setMountain(false);
        return;
      }
      const cx = cam.x + renderer.viewW / 2;
      const cy = cam.y + renderer.viewH / 2;
      // past the farthest step, out goes to the whole mountain
      if (!renderer.zoom(dir)) {
        if (dir === -1) setMountain(true);
        return;
      }
      cam.x = cx - renderer.viewW / 2;
      cam.y = cy - renderer.viewH / 2;
    },
    mountainTap: (x, y) => {
      if (!renderer.mountain) return false;
      // a tap on the map goes to that spot, close up
      const k = canvas.clientWidth ? canvas.width / canvas.clientWidth : 1;
      const t = renderer.mountainView.tileAt(x * k, y * k, game.g.world.w);
      setMountain(false);
      if (t) ui.lookAt(t.x, t.y);
      return true;
    },
  });
  const setMountain = (on: boolean): void => {
    renderer.mountain = on;
  };

  const ears = new Ears();
  // Esc clears the Foreman's dig queue; M mutes
  window.addEventListener('keydown', (e) => {
    if (
      e.key.toLowerCase() === 'm' &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !(e.target instanceof HTMLInputElement)
    ) {
      const on = ears.toggleMute();
      toast(on ? SETTINGS_TEXT.unmuted : SETTINGS_TEXT.muted, on ? undefined : SETTINGS_TEXT.mutedSub);
    }
    if (e.key === 'Escape' && !document.querySelector('.sheet, .modal, dialog[open]')) {
      if (renderer.mountain) setMountain(false);
      else dispatch({ type: 'cancelDig' });
    }
  });

  const save = (): void => saveLocal(game.g.state, Date.now());
  const replace = (s: GameState | null): void => {
    game.g = s ? loadGame(s) : createGame(newSeed());
    renderer.invalidate();
    save();
  };
  window.setInterval(save, AUTOSAVE_MS);
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      save();
    } else if (hiddenAt > 0) {
      // a background tab gets no frames, so count the time away the same way as a closed page
      const r = catchUp(game.g, Date.now() - hiddenAt);
      hiddenAt = 0;
      if (r) {
        away = r;
        renderer.invalidate();
      }
    }
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
    toScreen(x, y) {
      const k = renderer.scale / (canvas.clientWidth ? canvas.width / canvas.clientWidth : 1);
      return {
        x: ((x + 0.5) * TILE_PX - cam.x) * k,
        y: ((y + 0.5) * TILE_PX - cam.y) * k,
        w: canvas.clientWidth,
        h: canvas.clientHeight,
      };
    },
    tool: 'dig',
    setTool(t) {
      this.tool = t;
      canvas.style.cursor = t === 'dig' ? 'crosshair' : 'cell';
    },
    get mountain() {
      return renderer.mountain;
    },
    setMountain,
    get hover() {
      const h = input.hover;
      return h && input.mode === 'idle' ? h : null;
    },
    get away() {
      return away;
    },
    clearAway() {
      away = null;
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
    ears.frame(game.g, { x: cam.x, y: cam.y, w: renderer.viewW, h: renderer.viewH }, now);
    handleEvents(game.g, renderer, now);
    input.update(dt / 1000);
    if (following) {
      const f = game.g.state.foreman;
      cam.glide(f.x * TILE_PX + TILE_PX / 2, f.y * TILE_PX, renderer.viewW, renderer.viewH, dt / 1000);
    }
    cam.clamp(game.g.world.w, game.g.world.h, renderer.viewW, renderer.viewH);
    renderer.preview = input.mode === 'dig' ? input.path : [];
    const p0 = input.path[0];
    const h = input.hold;
    renderer.hold = h ? { x: h.x, y: h.y, p: Math.min(1, (performance.now() - h.t0) / HOLD_MS) } : null;
    sampleRates(game.g.state);
    renderer.touch = input.touch;
    renderer.hover = input.hover;
    renderer.aimTile = input.aimTile;
    renderer.previewCancel = input.mode === 'dig' && !!p0 && queued(game.g, p0.x, p0.y);
    const t0 = performance.now();
    renderer.draw(game.g, cam, now);
    perf.draw = perf.draw * 0.95 + (performance.now() - t0) * 0.05;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** ADR-020: every purchase says, in one big line, what it just did for you. */
function announce(g: Game, what: string, k = 1): void {
  const s = g.state;
  const ratio = (a: number, b: number): string => `×${(a / b).toFixed(2).replace(/\.?0+$/, '')}`;
  if (what === 'pick') {
    const p = PICKS[s.pickTier]!;
    toast(p.name, `${ratio(p.power, PICKS[s.pickTier - 1]!.power)} dig speed for you and every miner`);
  } else if (what.startsWith('metal:')) {
    const m = METALWORK.find((x) => `metal:${x.id}` === what)!;
    const lv = s.metalwork[m.id] ?? 0;
    toast(k > 1 ? `${m.name} ×${k}` : m.name, `Level ${lv} · ${metalFx(m.fx, m.per * lv)}`);
  } else if (what === 'miner') toast(k > 1 ? `+${k} miners` : '+1 miner', `${s.miners.length} at work`);
  else if (what === 'whetstone')
    toast(
      `Whetstone · level ${s.whetstone}`,
      `Your hand-mining +${Math.round(WHETSTONE.perLevel * s.whetstone * 100)}%`,
    );
  else if (what === 'haul') {
    const h = HAULS[s.haulTier]!;
    const o = HAULS[s.haulTier - 1]!;
    toast(h.name, `${ratio(h.speed * h.capacity, o.speed * o.capacity)} haulage`);
  } else if (what === 'deepPick') {
    toast(DEEP_PICK_TEXT.name(s.deepPick), `×${DEEP_PICK.mult} dig speed for you and every miner`);
  } else if (what.startsWith('cart:')) {
    toast(...CART_UI.took(CART_TEXT[what.slice(5) as keyof typeof CART_TEXT].name));
  } else if (what.startsWith('helper:')) {
    const h = HELPERS.find((x) => x.id === what.slice(7))!;
    toast(h.name, 'One less chore');
  } else if (what === 'kiln' || what === 'lampworks' || what === 'songloom') {
    const b = BUILDINGS.find((x) => x.id === what)!;
    toast(s.buildings[b.id] > 1 ? `${b.name} · level ${s.buildings[b.id]}` : b.name, b.text);
  } else if (what === 'plot')
    toast(k > 1 ? `+${k} plots` : '+1 plot', `${s.surface.plots.length} of ${FIELDS.maxPlots} in barley`);
  else if (what === 'sapling') toast(k > 1 ? `${k} saplings` : 'A sapling', 'Rook plants them out');
  else if (what === 'paddy') toast('A cress paddy', 'Flooded from the pumps');
  else if (what === 'hotbed') toast('A hot-bed', 'Each pepper harvest burns one ember ore');
  else if (what === 'cellar') toast('The root cellar', 'Seed it with spores');
  else if (what === 'cellarSeed') toast('Glowcaps sown', `A spore every ${ACT_CROPS.cellarEveryS} s`);
  else if (what === 'feast')
    toast('The feast bell!', `Every worker ×${FEAST.mult} for ${FEAST.seconds} s, and the crops grow faster`);
  else if (what.startsWith('meal:')) {
    const m = MEALS.find((x) => x.id === what.slice(5))!;
    const n = s.surface.meals[m.id];
    toast(`${m.name} · level ${n}`, `${m.text}: ${mealFx(m, n)}`);
  } else if (what.startsWith('wood:')) {
    const b = WOOD_BUYS.find((x) => x.id === what.slice(5))!;
    const n = s.surface.wood[b.id];
    toast(n > 1 ? `${b.name} · ${n}` : b.name, `${b.text}: +${Math.round(b.per * n * 100)}%`);
  }
}

let lastHaulAt = 0;
let lastBiome = -1;
let lastBest = 0;

/** Polish item 5: announce each new biome a run reaches. The first time ever, a banner; after that, a toast. */
function biomeWatch(g: Game): void {
  const s = g.state;
  const b = biomeAt(s.stats.maxDepthD).id;
  if (lastBiome >= 0 && b > lastBiome && b > 0) {
    if (lastBest < BIOMES[b]!.d0) window.dispatchEvent(new CustomEvent('undersong:biome', { detail: b }));
    else toast(BIOMES[b]!.name, `${BIOMES[b]!.d0 * FT_PER_TILE} ft`);
  }
  lastBiome = b;
  lastBest = s.stats.bestDepthD;
}

/** Polish item 3: once a second, float what came up the shaft (the miners' finds) at the shaft head, with icons. */
function shaftHead(g: Game, r: Renderer, now: number): void {
  if (now - lastHaulAt < 1000) return;
  lastHaulAt = now;
  const gains = (Object.entries(g.hauled) as [ResKey, number][])
    .filter(([, n]) => n >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  g.hauled = {};
  const x = SHAFT_X * TILE_PX + 22;
  const y = (g.world.surf[SHAFT_X]! - 1) * TILE_PX;
  gains.forEach(([k, n], i) =>
    r.fx.float(x, y - i * 11, `+${Math.round(n)}`, '#FFF2A8', now + i * 120, RES_ICON[k], 1600),
  );
}

function handleEvents(g: Game, r: Renderer, now: number): void {
  shaftHead(g, r, now);
  biomeWatch(g);
  // M7-06: one buzz a frame at most, the strongest earned: a break, ore, or ore in a Vein Rush
  let hum = 0;
  for (const e of g.events) {
    if (e.kind === 'mined') {
      const def = MATERIALS[e.m];
      if (e.by === 'foreman')
        hum = Math.max(
          hum,
          !def?.isOre ? HAPTICS.brk : g.state.foreman.chain > 0 ? HAPTICS.rushOre : HAPTICS.ore,
        );
      const host = def?.host !== undefined ? MATERIALS[def.host] : def;
      if (host) r.fx.debris(e.x * TILE_PX + 8, e.y * TILE_PX + 8, host.ramp, 7);
    } else if (e.kind === 'drop') {
      const k = e.res as ResKey;
      r.fx.float(e.x * TILE_PX + 12, e.y * TILE_PX + 2, `+${e.n}`, '#FFD65A', now, RES_ICON[k]);
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
    } else if (e.kind === 'collapse') {
      r.fx.shake(2, 600, now);
      for (let i = 0; i < 3; i++)
        r.fx.debris(e.x * TILE_PX + 8, (e.y - 2 + i) * TILE_PX, ['#5F6487', '#373A52', '#141A33'], 8);
    } else if (e.kind === 'harvest' || e.kind === 'chop') {
      const x = Math.floor(e.x);
      const y = (g.world.surf[x]! - (e.kind === 'chop' ? 3 : 1)) * TILE_PX;
      const golden = e.kind === 'harvest' && e.golden;
      r.fx.float(
        e.x * TILE_PX + 8,
        y,
        `+${e.n}`,
        golden ? '#FFF2A8' : '#FFD65A',
        now,
        e.kind === 'chop' ? 'timber' : 'barley',
      );
      if (golden) for (let i = 0; i < 8; i++) r.fx.sparkle(e.x * TILE_PX + 8, y + 8, '#FFF2A8');
    } else if (e.kind === 'bought') {
      announce(g, e.what, e.n);
    } else if (e.kind === 'veinBreak') {
      // M8-02: the vein gives way
      r.fx.shake(2, 400, now);
      toast('Vein Break', `${e.n + 1} tiles of ore at once`);
      hum = Math.max(hum, HAPTICS.rushOre);
    } else if (e.kind === 'shatter') {
      const cx = e.x * TILE_PX + 8;
      const cy = e.y * TILE_PX + 8;
      const n = e.flash || e.ring ? 6 : 3;
      const col = e.flash ? '#5FF0D8' : e.ring ? '#C4F0FF' : '#FFF2A8';
      for (let i = 0; i < n; i++) r.fx.sparkle(cx, cy, col);
      if (e.flash) r.fx.flash(cx, cy, '#5FF0D8', now);
    } else if (e.kind === 'ahead') {
      // M9-05: past last run's ghost
      const [h, sub] = aheadText(e.min);
      toast(h, sub);
    } else if (e.kind === 'cart') {
      // M10-01: the tinker parks by the shaft
      toast(...CART_UI.arrived);
    } else if (e.kind === 'curio') {
      // M10-02: a curio for the shelf, and a full set is a bigger moment
      const c = CURIOS.find((k) => k.id === e.id);
      const cx = e.x * TILE_PX + 8;
      const cy = e.y * TILE_PX + 8;
      const col = c?.rarity === 'singing' ? '#5FF0D8' : c?.rarity === 'fine' ? '#FFD65A' : '#E8F4F0';
      for (let i = 0; i < (c?.rarity === 'singing' ? 16 : 8); i++) r.fx.sparkle(cx, cy, col);
      if (c?.rarity === 'singing') r.fx.flash(cx, cy, col, now);
      if (c) toast(...CURIO_UI.found(CURIO_TEXT[c.id]!.name, c.rarity));
      if (e.set !== undefined) toast(...CURIO_UI.setFound(BIOMES[e.set]!.name));
      hum = Math.max(hum, HAPTICS.rushOre);
    } else if (e.kind === 'fetched') {
      for (let i = 0; i < 6; i++) r.fx.sparkle(e.x * TILE_PX + 8, e.y * TILE_PX + 4, '#FFD65A');
      r.fx.float(e.x * TILE_PX + 12, e.y * TILE_PX, `+${e.n}`, '#FFD65A', now, RES_ICON[e.res as ResKey]);
      toast(...DOG_TEXT.fetched(`${e.n} ${RES_NAMES[e.res as ResKey]}`));
    } else if (e.kind === 'rain') {
      toast(...RAIN_TEXT);
    } else if (e.kind === 'marker') {
      // M11-01: a marker under the Heart
      r.fx.shake(2, 500, now);
      toast(...MARKER_TEXT.reached(markerD(e.k) * FT_PER_TILE, e.echoes, e.gold));
      hum = Math.max(hum, HAPTICS.rushOre);
    } else if (e.kind === 'autoCaveIn') {
      toast(...AUTO_TEXT.done(e.echoes));
    } else if (e.kind === 'record') {
      r.fx.shake(1, 300, now);
      toast(`New record · ${e.ft} ft`, 'Deeper than any cycle before');
    } else if (e.kind === 'caveIn') {
      r.invalidate();
      r.fx.shake(3, 1500, now);
    }
  }
  if (hum && document.visibilityState === 'visible') buzz(hum);
  g.events.length = 0;
}

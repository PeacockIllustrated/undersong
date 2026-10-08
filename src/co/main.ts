// Holloway & Co. boot: load or start, run the 60 Hz loop, draw, play sounds, save at dawn and at night.
import { render, h } from 'preact';
import { SHAFT_X, SKY_ROWS, TILE_PX } from '../data/constants';
import { MATERIALS } from '../data/materials';
import { loadSprites } from '../render/sprites';
import { buildTileTextures } from '../render/tiles';
import { Sound } from '../audio/sound';
import { breakCue } from '../audio/cues';
import { VERSES } from '../story/verses';
import {
  CO_PICKS,
  FEATS,
  GEMS,
  MAX_STEPS_PER_FRAME,
  ORES,
  RELICS,
  STEP_S,
  TOOLS,
  type BookId,
  type RelicId,
  type ShopId,
} from './data/co';
import { Input } from './input';
import { View } from './render/view';
import { idleControl } from './sim/body';
import {
  awayPay,
  buy,
  buyBook,
  buyRelic,
  duskDone,
  nextDay,
  overmanDay,
  rerollTinker,
  settleDusk,
  signContract,
  type SignOpts,
  singDown,
  chooseEnding,
} from './sim/contract';
import { pickIndex } from './sim/stats';
import { startDay, stepDay } from './sim/day';
import { newGame, type CoEvent, type Game } from './sim/state';
import { loadGame, saveGame, wipeGame } from './save';
import { App, type Bridge } from './ui/App';
import { toast } from './ui/toasts';
import { ENDINGS, FOREMAN_INTROS, SEAM_INTROS } from './story/company';
import { fmt } from '../ui/format';
import './ui/co.css';

loadSprites();
buildTileTextures();

const T = TILE_PX;
const newSeed = (): number => (Math.floor(Math.random() * 0x7fffffff) ^ Date.now()) >>> 0;

function boot(): void {
  const loaded = loadGame(newSeed());
  const g: Game = newGame(newSeed());
  if (loaded) g.s = loaded.s;
  // a day cut short by closing the page starts again at dawn
  if (g.s.phase === 'day' || g.s.phase === 'dusk') startDay(g);
  const awayS = loaded && loaded.savedAt ? (Date.now() - loaded.savedAt) / 1000 : 0;
  const pay = awayPay(g, awayS);

  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const view = new View(canvas);
  try {
    const cap = Number(localStorage.getItem('hollowayco.crowd'));
    if ([50, 100, 200, 400].includes(cap)) view.spriteCap = cap;
  } catch {
    // no storage: keep the default crowd
  }
  const input = new Input(canvas);
  const sound = new Sound(0.55, 0);
  let muted = false;
  let paused = false;
  let featsOpen = false;
  const fit = (): void => view.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  fit();
  window.addEventListener('resize', fit);
  view.fx.calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const unlock = (): void => sound.unlock();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => {
    sound.pause(document.hidden);
    if (document.hidden) {
      input.reset();
      if (g.s.phase !== 'day') saveGame(g.s);
    }
  });
  window.addEventListener('beforeunload', () => {
    if (g.s.phase !== 'day') saveGame(g.s);
  });

  const play = (id: Parameters<Sound['play']>[0], pitch = 1): void => {
    if (!muted) sound.play(id, performance.now(), pitch);
  };

  const bridge: Bridge = {
    g,
    input,
    get paused() {
      return paused;
    },
    get muted() {
      return muted;
    },
    get crowd() {
      return view.spriteCap;
    },
    setCrowd: (n: number) => {
      view.spriteCap = n;
      try {
        localStorage.setItem('hollowayco.crowd', String(n));
      } catch {
        // a per-device preference; fine to lose
      }
    },
    setPaused: (p) => {
      paused = p;
      input.reset();
    },
    get feats() {
      return featsOpen;
    },
    setFeats: (o: boolean) => {
      featsOpen = o;
    },
    setMuted: (m) => {
      muted = m;
    },
    buy: (id: ShopId) => {
      const before = id === 'pick' ? CO_PICKS[pickIndex(g.s)]!.power : 0;
      if (buy(g, id)) {
        play('bought');
        if (id === 'pick') {
          const p = CO_PICKS[pickIndex(g.s)]!;
          play('record');
          toast(`${p.name}! Digs ×${(p.power / before).toFixed(1).replace(/\.0$/, '')} faster`, 'gold');
        }
        saveGame(g.s);
        return true;
      }
      play('refused');
      return false;
    },
    buyBook: (id: BookId) => {
      if (buyBook(g, id)) {
        play('bought');
        saveGame(g.s);
        return true;
      }
      play('refused');
      return false;
    },
    buyRelic: (id: RelicId) => {
      if (buyRelic(g, id)) {
        play('record');
        toast(`${RELICS[id].name}: ${RELICS[id].blurb}`, 'gold');
        saveGame(g.s);
        return true;
      }
      play('refused');
      return false;
    },
    reroll: () => {
      if (rerollTinker(g)) {
        play('ui');
        saveGame(g.s);
        return true;
      }
      play('refused');
      return false;
    },
    singDown: () => {
      if (singDown(g)) {
        play('caveIn');
        saveGame(g.s);
      }
    },
    chooseEnding: (which) => {
      if (!chooseEnding(g, which)) return;
      if (which === 'quota') {
        toast(ENDINGS.quota.after, 'gold');
        play('record');
      } else play('caveIn', 1.4);
      saveGame(g.s);
    },
    overman: () => {
      if (!overmanDay(g)) return;
      const t = g.s.tally;
      if (t)
        toast(
          `The Overman ran day ${t.day}: ${fmt(t.deposited.floor())} of ${fmt(t.quota)} coal`,
          t.passed ? 'gold' : 'warn',
        );
      play(g.s.phase === 'cavein' ? 'caveIn' : 'bought');
      saveGame(g.s);
    },
    nextDay: () => {
      nextDay(g);
      input.reset();
      play('biome');
      saveGame(g.s);
    },
    sign: (opts: SignOpts = {}) => {
      signContract(g, newSeed(), opts);
      input.reset();
      const c = g.s.contract;
      const intro = [FOREMAN_INTROS[c.foreman], c.seam !== 'openCut' ? SEAM_INTROS[c.seam] : '']
        .filter(Boolean)
        .join(' ');
      if (intro && g.s.meta.contracts > 0) toast(intro, 'verse');
      play('biome');
      saveGame(g.s);
    },
    startOver: () => {
      wipeGame();
      location.reload();
    },
  };
  input.onPause = () => {
    if (g.s.phase === 'day') bridge.setPaused(!paused);
  };
  input.onKey = (k) => {
    // Enter or Space at night starts the next day; on the title or after a Cave-in it signs on
    if (g.s.phase === 'night' && (k === 'enter' || k === ' ')) {
      bridge.nextDay();
      return true;
    }
    if ((g.s.phase === 'title' || g.s.phase === 'cavein') && k === 'enter') {
      bridge.sign();
      return true;
    }
    return false;
  };

  render(h(App, { bridge }), document.getElementById('ui')!);
  // a handle for the smoke test and the console, dev builds only
  if (import.meta.env.DEV) {
    // play-test hooks for the dev server only
    const win = window as unknown as { __co: Bridge; __coDev: { startDay(): void } };
    win.__co = bridge;
    win.__coDev = { startDay: () => startDay(g) };
  }
  if (pay.scrip.gt(0))
    toast(
      `Night-shift pay while you were away: +${fmt(pay.scrip)} scrip${pay.ore ? ` and ${pay.ore} ore` : ''}`,
      'gold',
    );

  const onEvent = (e: CoEvent, now: number): void => {
    const fx = view.fx;
    switch (e.t) {
      case 'chip': {
        play('chip');
        const col = MATERIALS[e.m]?.ramp[1] ?? '#878E9A';
        fx.debris((e.x + 0.5) * T, (e.y + 0.5) * T, [col], 2, 0.5);
        break;
      }
      case 'break': {
        play(breakCue(e.m), e.rush > 1 ? 1 + (e.rush - 1) * 0.15 : 1);
        const def = MATERIALS[e.m];
        const host = def?.host !== undefined ? MATERIALS[def.host] : def;
        fx.debris((e.x + 0.5) * T, (e.y + 0.5) * T, host?.ramp ?? ['#878E9A'], 9);
        if (e.coal > 0)
          fx.float(
            (e.x + 0.5) * T,
            e.y * T,
            `+${e.coal} coal${e.rush > 1 ? `  RUSH ×${e.rush.toFixed(2).replace(/\.?0+$/, '')}` : ''}`,
            '#E8F4F0',
            now,
          );
        if (e.ore > 0 && e.oreId)
          fx.float((e.x + 0.5) * T, e.y * T, `+${e.ore} ${ORES[e.oreId].name.toLowerCase()}`, '#F2A35E', now);
        break;
      }
      case 'crewOre':
        fx.sparkle((e.x + 0.5) * T, (e.y + 0.5) * T, '#F2A35E', 6);
        fx.float((e.x + 0.5) * T, e.y * T, `+${e.n} ${ORES[e.ore].name.toLowerCase()}`, '#F2A35E', now);
        break;
      case 'refused':
        play('refused');
        fx.float((e.x + 0.5) * T, e.y * T, 'too hard', '#E0532F', now);
        break;
      case 'full':
        toast('Pack full: take it up to the kibble', 'warn');
        play('refused');
        break;
      case 'deposit':
        play('drop');
        if (e.coal.gt(0)) {
          fx.float(e.x * T, (e.y - 2) * T, `+${fmt(e.coal)} coal`, '#FFF2A8', now, true);
          fx.sparkle(e.x * T, (e.y - 1) * T, '#FFD65A', 10);
        }
        if (e.scrip.gt(0)) fx.float(e.x * T, (e.y - 3) * T, `+${fmt(e.scrip)} scrip`, '#FFD65A', now, true);
        if (e.ores > 0) {
          fx.float(e.x * T, (e.y - 4) * T, `+${e.ores} ore to stock`, '#F2A35E', now, true);
          fx.sparkle(e.x * T, (e.y - 1) * T, '#F2A35E', 8);
        }
        break;
      case 'chest':
        play('chest');
        fx.sparkle((e.x + 0.5) * T, e.y * T, '#FFD65A', 14);
        fx.float((e.x + 0.5) * T, e.y * T, `+${fmt(e.scrip)} scrip`, '#FFD65A', now, true);
        if (e.relic) toast(`Relic: ${RELICS[e.relic].name}. ${RELICS[e.relic].blurb}`, 'gold');
        if (e.gem) {
          play('record', 1.2);
          fx.kick(2, 200, now);
          fx.sparkle((e.x + 0.5) * T, e.y * T, '#B9FFF3', 22);
          toast(`${GEMS[e.gem].name}! The chest pays +${fmt(e.scrip)} scrip`, 'gold');
        }
        break;
      case 'feat': {
        const f = FEATS.find((k) => k.id === e.id);
        if (f) {
          toast(`Feat: ${f.name}. ${f.blurb}`, 'gold');
          play('record');
        }
        break;
      }
      case 'verse': {
        const v = VERSES[e.verse];
        if (v) {
          sound.verse(e.verse, performance.now());
          toast(`Verse ${v.n}: ${v.lines[0]} ${v.lines[1]}`, 'verse');
        }
        break;
      }
      case 'boom':
        play('collapse');
        fx.kick(4, 380, now);
        fx.debris(e.x * T, e.y * T, ['#FF9A3C', '#FFD65A', '#E0532F', '#878E9A'], 26, 1.6);
        break;
      case 'lastBell':
        play('record');
        toast('Last bell: twenty seconds to dusk', 'warn');
        break;
      case 'quotaMet': {
        play('record');
        toast('Quota met. Everything more is scrip', 'gold');
        // fireworks over the headframe
        const w = g.world;
        if (w) {
          const kx = (SHAFT_X + 0.5) * T;
          const ky = ((w.surf[SHAFT_X] ?? SKY_ROWS) - 3) * T;
          for (const col of ['#FFD65A', '#5FF0D8', '#E0532F', '#FFF2A8', '#7FD6FF'])
            fx.sparkle(kx, ky, col, 14);
          fx.float(kx, ky - 2 * T, 'QUOTA MET!', '#A8F08A', now, true);
          fx.kick(3, 300, now);
        }
        break;
      }
      case 'dusk':
        play('caveIn', 1.4);
        break;
      case 'jump':
        break;
      case 'land':
        if (e.speed > 14) fx.kick(2, 160, now);
        break;
      case 'ladder':
      case 'platform':
        play('ui');
        break;
      case 'tool':
        play('ui', 1.3);
        toast(TOOLS.find((t) => t.id === e.tool)!.name, 'gold');
        break;
      case 'veinBreak': {
        play('record', 1.1);
        play('breakOre', 0.8);
        fx.kick(3, 260, now);
        fx.debris((e.x + 0.5) * T, (e.y + 0.5) * T, ['#FFD65A', '#FFF2A8', '#F2A35E'], 22, 1.4);
        const what = e.coal > 0 ? `+${e.coal} coal` : `+${e.ore} ore`;
        fx.float((e.x + 0.5) * T, (e.y - 1) * T, `VEIN BREAK! ${what}`, '#FFD65A', now, true);
        break;
      }
      case 'scatter':
        play('breakStone', 1.4);
        for (let i = 0; i < 5; i++)
          fx.sparkle((e.x + e.ax * (1 + i * 0.5)) * T, (e.y + e.ay * (1 + i * 0.5)) * T, '#FFD65A', 2);
        if (e.kick) {
          fx.kick(2, 140, now);
          fx.debris(e.x * T, e.y * T, ['#FF9A3C', '#FFD65A'], 10, 1.2);
        }
        break;
      case 'mortar':
        play('collapse', 1.6);
        fx.kick(1, 120, now);
        break;
      case 'overcome':
        play('collapse', 0.7);
        fx.kick(3, 300, now);
        toast(`The heat got you. Hauled up, ${e.lost} spilled on the way. Take the cold lance down.`, 'warn');
        break;
      case 'rising':
        if (e.y % 6 === 0) {
          play('rain', 0.8);
          toast('The water is rising', 'warn');
        }
        break;
      case 'rig':
        play(e.placed ? 'cart' : 'ui', e.placed ? 1 : 0.7);
        break;
    }
  };

  let last = performance.now();
  let acc = 0;
  let crewPopT = 0;
  let savedDay = -1;
  let ctl = idleControl();
  const frame = (now: number): void => {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    const inDay = g.s.phase === 'day' && !paused;
    if (inDay || g.s.phase === 'dusk') {
      if (savedDay !== g.s.contract.day && g.s.phase === 'day') {
        saveGame(g.s);
        savedDay = g.s.contract.day;
      }
      acc += dt;
      let steps = 0;
      ctl = input.control(view, g.day?.body ?? null);
      while (acc >= STEP_S && steps < MAX_STEPS_PER_FRAME) {
        stepDay(g, ctl, STEP_S);
        ctl = { ...ctl, jumpPressed: false, throwPressed: false, ladderPressed: false };
        acc -= STEP_S;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) acc = 0;
      for (const e of g.events) onEvent(e, now);
      g.events.length = 0;
      // the crew's coal shows as pops over the kibble about once a second
      crewPopT += dt;
      if (g.day && g.day.crewPop >= 1 && crewPopT > 1) {
        const w = g.world!;
        const n = Math.floor(g.day.crewPop);
        g.day.crewPop -= n;
        crewPopT = 0;
        view.fx.float(
          (SHAFT_X + 2) * T,
          ((w.surf[SHAFT_X + 2] ?? SKY_ROWS) - 1.5) * T,
          `+${n} crew`,
          '#B9FFF3',
          now,
        );
      }
      if (g.day && g.day.haulPop >= 1 && crewPopT > 0.5) {
        const w = g.world!;
        const n = Math.floor(g.day.haulPop);
        g.day.haulPop -= n;
        view.fx.float(
          (SHAFT_X + 3) * T,
          ((w.surf[SHAFT_X + 3] ?? SKY_ROWS) - 2.5) * T,
          `+${n} hauled`,
          '#F2A35E',
          now,
        );
      }
      if (duskDone(g)) {
        settleDusk(g);
        saveGame(g.s);
        if (g.s.phase === 'cavein') play('caveIn');
      }
    } else {
      acc = 0;
      if (g.day) ctl = input.control(view, g.day.body);
      // night, the title and the Cave-in: only feats are worth showing; the rest belonged to a finished day
      for (const e of g.events) if (e.t === 'feat') onEvent(e, now);
      g.events.length = 0;
    }
    view.draw(g, ctl, now, dt, input.usingTouch);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot();

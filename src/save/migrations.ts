/* eslint-disable @typescript-eslint/no-explicit-any -- migrations work on untyped old saves */
// One migration per SAVE_VERSION bump. Players never lose a save (golden rule 5).
import { RES_KEYS } from '../data/resources';
import { newGame, newSurface, SAVE_VERSION, type GameState } from '../sim/state';
import { Decimal } from '../sim/decimal';

type Raw = { v: number } & Record<string, unknown>;

/** MIGRATIONS[n] upgrades a version-n save to n + 1. */
const MIGRATIONS: Record<number, (s: Raw) => Raw> = {
  // v1 → v2 (M1): forge recipes, haulage carry, Vein Rush idle timer, milestone times, lines said in any run.
  1: (s) => {
    const o = s as Record<string, any>;
    o.forge = { progress: o.forge?.progress ?? 0, recipe: 'auto', next: 0 };
    o.haulAcc = 0;
    if (o.foreman) {
      delete o.foreman.lastOreT;
      o.foreman.idleMs = 0;
    }
    if (o.stats) o.stats.firsts = {};
    if (o.story) o.story.ever = [...(o.story.seen ?? [])];
    o.v = 2;
    return o as Raw;
  },
  // v2 → v3 (M2): lifetime Echoes, best pick, Lamp-works progress, collapse count.
  2: (s) => {
    const o = s as Record<string, any>;
    o.echoesEver = o.echoes;
    o.lampProgress = 0;
    if (o.stats) {
      o.stats.bestPick = o.pickTier ?? 0;
      o.stats.collapses = 0;
    }
    o.v = 3;
    return o as Raw;
  },
  // v3 → v4 (juice pass, ADR-020): village helpers.
  3: (s) => {
    const o = s as Record<string, any>;
    o.helpers = {};
    o.whetstone = 0;
    o.helperAcc = 0;
    o.v = 4;
    return o as Raw;
  },
  // v4 → v5 (M3): water levels kept as per-tile diffs, the pumps' banked fraction.
  4: (s) => {
    const o = s as Record<string, any>;
    if (o.world) o.world.water = {};
    o.pumpAcc = 0;
    o.v = 5;
    return o as Raw;
  },
  // v5 → v6 (M6, ADR-029): Holloway above. Barley and timber are filled in below with every other missing resource.
  5: (s) => {
    const o = s as Record<string, any>;
    o.surface = newSurface();
    o.v = 6;
    return o as Raw;
  },
  // v6 → v7 (M6-07, ADR-030): act crops. Cress and pepper are filled in below; plots without a crop stay barley.
  6: (s) => {
    const o = s as Record<string, any>;
    const sf = o.surface ?? (o.surface = newSurface());
    sf.meals = { soup: 0, broth: 0, ...sf.meals };
    sf.cellar = 0;
    sf.cellarAcc = 0;
    o.v = 7;
    return o as Raw;
  },
  // v7 → v8 (M9-03, M9-05): what the last run left behind, and this run's depth by minute.
  7: (s) => {
    const o = s as Record<string, any>;
    o.runDepth = [];
    o.lastRun = { miners: 0, depthByMin: [] };
    o.metalwork = {};
    o.v = 8;
    return o as Raw;
  },
};

export function migrate(raw: Raw): GameState {
  let s = raw;
  while (s.v < SAVE_VERSION) {
    const m = MIGRATIONS[s.v];
    if (!m) throw new Error(`No migration from save version ${s.v}.`);
    s = m(s);
  }
  // Fill any field a save is missing with the new-game default, so additive changes stay safe.
  const base = newGame(typeof s.seed === 'number' ? s.seed : 1) as unknown as Record<string, unknown>;
  for (const k of Object.keys(base)) if (!(k in s)) s[k] = base[k];
  // a resource added since the save was written starts at zero
  for (const bag of ['res', 'underground'] as const) {
    const r = s[bag] as Record<string, unknown>;
    for (const k of RES_KEYS) if (!(r[k] instanceof Decimal)) r[k] = new Decimal(0);
  }
  return s as unknown as GameState;
}

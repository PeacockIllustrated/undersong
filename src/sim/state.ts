// The one serialisable game state. dev-bible §1.1
import type { ObjKind } from '../data/objects';
import { RES_KEYS, type ResKey } from '../data/resources';
import { SHAFT_X, SKY_ROWS } from '../data/constants';
import { Decimal, ZERO } from './decimal';
import type { Recipe } from '../data/economy';
import type { HelperId } from '../data/helpers';
import type { MealId, WoodBuyId } from '../data/surface';

export const SAVE_VERSION = 6;

export interface Tile {
  x: number;
  y: number;
}

export interface Foreman {
  x: number;
  y: number;
  /** Tile being mined, if any. */
  target: Tile | null;
  /** Tiles queued by dragging. */
  queue: Tile[];
  /** Hardness units of work done on the target. */
  work: number;
  /** Vein Rush chain (canon §4.7). */
  chain: number;
  /** Ms the foreman has stood idle; a Vein Rush breaks after the window. */
  idleMs: number;
  lastOre: Tile | null;
}

export interface Miner {
  id: number;
  x: number;
  y: number;
  target: Tile | null;
  work: number;
  /** Id of a pest stalling this miner, if any. */
  stalledBy: number | null;
}

export type PestKind = 'beetle' | 'moth' | 'eel' | 'golem' | 'wisp';

export interface Pest {
  id: number;
  kind: PestKind;
  x: number;
  y: number;
  /** Run time it appeared. */
  born: number;
  /** Miner it is bothering, if any. */
  minerId: number | null;
  /** Taps still needed to clear it (shard golems take several). */
  hp?: number;
}

export interface Glint {
  x: number;
  y: number;
  until: number;
  kind: 'glint' | 'hum';
}

/** A field plot: growth from 0 to 1 (ripe), and whether it ripened golden. canon §17.1 */
export interface Plot {
  t: number;
  golden: boolean;
}

/** A tree in the woodlot. Trees are not the village: they stay through a Cave-in. canon §17.3 */
export interface Tree {
  /** Index into WOODLOT.slots. */
  slot: number;
  /** Seconds it has been growing. */
  age: number;
  /** Cave-ins it has stood through. */
  stood: number;
}

/** Holloway above (ADR-028). The fields, meals and timber buys reset on a Cave-in; trees and the tallies stay. */
export interface Surface {
  /** Tansy has come up the valley road this run. */
  tansy: boolean;
  /** Rook has come this run. */
  rook: boolean;
  plots: Plot[];
  trees: Tree[];
  meals: Record<MealId, number>;
  wood: Record<WoodBuyId, number>;
  /** Crops toward the feast bell, feasts rung this run, and the run time (ms) the current feast ends. */
  feast: number;
  feasts: number;
  feastUntil: number;
  /** Tansy rings the bell herself when it is full (needs Tansy's hands). */
  autoFeast: boolean;
  /** Seconds banked toward Tansy's next harvest. */
  tansyAcc: number;
  /** Harvests and fellings in any run, for when the helpers are offered. */
  harvestsEver: number;
  chopsEver: number;
}

export function newSurface(): Surface {
  return {
    tansy: false,
    rook: false,
    plots: [],
    trees: [],
    meals: { bread: 0, porridge: 0 },
    wood: { hearth: 0, cottage: 0 },
    feast: 0,
    feasts: 0,
    feastUntil: 0,
    autoFeast: false,
    tansyAcc: 0,
    harvestsEver: 0,
    chopsEver: 0,
  };
}

export interface SurveyEntry {
  cycle: number;
  depthFt: number;
  verses: number;
  echoes: string;
  /** Who wrote it, as the Survey Book shows it. */
  hand: 'old' | 'yours';
}

export type StoryEvent =
  | { kind: 'verse'; verse: number; again: boolean }
  | { kind: 'line'; id: string }
  | { kind: 'rush'; mult: number }
  | { kind: 'chest'; res: ResKey; n: string }
  | { kind: 'unlock'; id: string }
  | { kind: 'collapse'; x: number; y: number }
  | { kind: 'caveIn' }
  | { kind: 'ending'; which: 'seal' | 'sing' };

export interface GameState {
  v: number;
  seed: number;
  /** PRNG state (mulberry32). */
  rng: number;
  cycle: number;
  /** Run time in ms (resets on Cave-in). */
  t: number;
  totalT: number;
  res: Record<ResKey, Decimal>;
  /** Miners' output waiting at the shaft for haulage. */
  underground: Record<ResKey, Decimal>;
  buildings: { forge: number; lampworks: number; kiln: number; songloom: number };
  pickTier: number;
  /** Whetstone levels this run (canon §9.2). */
  whetstone: number;
  haulTier: number;
  forge: { progress: number; recipe: Recipe; next: number };
  /** Fractional ore waiting to be hauled up this tick. */
  haulAcc: number;
  kilnProgress: number;
  lampProgress: number;
  /** Fraction of a water unit the pumps have banked toward their next unit. */
  pumpAcc: number;
  /** Village helpers hired (level by id). They stay through a Cave-in. canon §14 */
  helpers: Partial<Record<HelperId, number>>;
  /** Seconds banked toward Pell's next shoo. */
  helperAcc: number;
  miners: Miner[];
  pests: Pest[];
  glints: Glint[];
  nextId: number;
  foreman: Foreman;
  world: {
    diffs: Record<string, number>;
    objects: Record<string, ObjKind>;
    /** Water levels (0–8) of every tile whose water has changed since the mountain was made. */
    water: Record<string, number>;
    endlessRows: number;
    oldShaftD: number;
  };
  echoes: Decimal;
  /** Every Echo ever earned, spent or not. Each speeds the village (canon §4.11). */
  echoesEver: Decimal;
  upgrades: Record<string, number>;
  verses: { known: boolean[]; run: boolean[] };
  survey: SurveyEntry[];
  stats: {
    maxDepthD: number;
    bestDepthD: number;
    tilesMined: number;
    caveIns: number;
    chests: number;
    /** Best pick tier ever bought, for the Heirloom Pick. */
    bestPick: number;
    collapses: number;
    /** Run time (ms) when each milestone first happened this run, for the balance sim and the Survey Book. */
    firsts: Record<string, number>;
  };
  /** seen: line ids said this run; ever: said in any run. events: waiting to be shown by the UI. */
  story: { seen: string[]; ever: string[]; events: StoryEvent[]; flags: Record<string, boolean> };
  charms: { owned: string[]; equipped: string[] };
  ending: null | 'seal' | 'sing';
  ngPlus: number;
  heirloomTier: number;
  surface: Surface;
  /** Wall-clock ms when last saved, for offline progress. Set by the save layer, never the sim. */
  savedAt: number;
}

/** The Survey Book is never empty: earlier cycles left pages, in the Foreman's own hand. */
export const OLD_PAGES: readonly SurveyEntry[] = [
  { cycle: 0, depthFt: 1424, verses: 12, echoes: '?', hand: 'old' },
  { cycle: 0, depthFt: 1424, verses: 12, echoes: '?', hand: 'old' },
  { cycle: 0, depthFt: 1424, verses: 12, echoes: '?', hand: 'old' },
];

export function emptyRes(): Record<ResKey, Decimal> {
  const r = {} as Record<ResKey, Decimal>;
  for (const k of RES_KEYS) r[k] = ZERO();
  return r;
}

export function newGame(seed: number): GameState {
  return {
    v: SAVE_VERSION,
    seed,
    rng: seed ^ 0x9e3779b9,
    cycle: 1,
    t: 0,
    totalT: 0,
    res: emptyRes(),
    underground: emptyRes(),
    buildings: { forge: 1, lampworks: 0, kiln: 0, songloom: 0 },
    pickTier: 0,
    whetstone: 0,
    haulTier: 0,
    forge: { progress: 0, recipe: 'auto', next: 0 },
    haulAcc: 0,
    kilnProgress: 0,
    lampProgress: 0,
    pumpAcc: 0,
    helpers: {},
    helperAcc: 0,
    miners: [],
    pests: [],
    glints: [],
    nextId: 1,
    foreman: {
      x: SHAFT_X - 1,
      y: SKY_ROWS - 1,
      target: null,
      queue: [],
      work: 0,
      chain: 0,
      idleMs: 0,
      lastOre: null,
    },
    world: { diffs: {}, objects: {}, water: {}, endlessRows: 0, oldShaftD: 0 },
    echoes: ZERO(),
    echoesEver: ZERO(),
    upgrades: {},
    verses: { known: new Array(12).fill(false), run: new Array(12).fill(false) },
    survey: OLD_PAGES.map((p) => ({ ...p })),
    stats: {
      maxDepthD: 0,
      bestDepthD: 0,
      tilesMined: 0,
      caveIns: 0,
      chests: 0,
      bestPick: 0,
      collapses: 0,
      firsts: {},
    },
    story: { seen: [], ever: [], events: [], flags: {} },
    charms: { owned: [], equipped: [] },
    ending: null,
    ngPlus: 0,
    heirloomTier: 0,
    surface: newSurface(),
    savedAt: 0,
  };
}

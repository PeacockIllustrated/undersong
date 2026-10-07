// A running game: the serialisable state plus the world rebuilt from it. dev-bible §1.1
import { generateWorld } from '../world/generator';
import type { World } from '../world/world';
import { torchMult } from './power';
import { rootTiles } from './surface';
import { M } from '../data/materials';
import { wetTiles } from '../world/water';
import { setWater, wakeWater } from './water';
import { newGame, type GameState } from './state';
import type { ResKey } from '../data/resources';
import { newTally, type Tally } from './tally';

/** Something the renderer, audio or UI may want to react to. Never saved. */
import type { Tile } from './state';

export type SimEvent =
  | { kind: 'mined'; x: number; y: number; m: number; by: 'foreman' | 'miner' }
  | { kind: 'refused'; x: number; y: number; needs?: string }
  | { kind: 'ahead'; min: number }
  | { kind: 'drop'; x: number; y: number; res: string; n: number }
  | { kind: 'smelt'; bar: string }
  /** Holloway above (canon §17): a plot reaped, a tree felled. x is the tile column. */
  | { kind: 'harvest'; x: number; n: number; golden: boolean }
  | { kind: 'chop'; x: number; n: number }
  /** n: how many at once (M8-03), when more than one. */
  | { kind: 'bought'; what: string; n?: number; auto?: true }
  | { kind: 'pest'; x: number; y: number; cleared: boolean }
  | { kind: 'chest'; x: number; y: number }
  | { kind: 'verse'; verse: number; x: number; y: number }
  | { kind: 'rush'; mult: number; x: number; y: number }
  /** M8-02: the Rush cap broke a vein open. */
  | { kind: 'veinBreak'; x: number; y: number; n: number }
  /** M8-02: one tile of a Vein Break pops; i counts up from 0. Glowroot veins flash, Geode veins ring. */
  | { kind: 'shatter'; x: number; y: number; i: number; m: number; flash: boolean; ring: boolean }
  | { kind: 'collapse'; x: number; y: number }
  /** A new depth record since the last Cave-in. */
  | { kind: 'record'; ft: number }
  /** verses: the verses found this run, for the Cave-in's song (M9-04). */
  | { kind: 'caveIn'; verses: number[] }
  /** M10: the tinker's cart parks, a curio turns up, the dog fetches a chest, a shower starts. */
  | { kind: 'cart' }
  | { kind: 'curio'; id: string; x: number; y: number; set?: number }
  | { kind: 'fetched'; x: number; y: number; res: string; n: number }
  | { kind: 'rain' }
  | { kind: 'marker'; k: number; echoes: number; gold: number }
  | { kind: 'autoCaveIn'; echoes: number };

export interface Game {
  state: GameState;
  world: World;
  events: SimEvent[];
  /** Air tiles connected to the shaft (1) — cached, rebuilt when the world changes. */
  reach: Uint8Array;
  reachDirty: boolean;
  /** Deepest row of the reach (valid after reach() runs). */
  reachMaxY: number;
  /** Solid tiles beside the reach, in scan order (row by row): the faces anyone could work. Rebuilt with the reach. */
  frontier: number[];
  /** The frontier faces a miner would consider for one pick tier, worked out once per reach. */
  faces: { tier: number; list: number[] } | null;
  /** True while catching up on time away: pests and collapses wait for the player. */
  offline?: boolean;
  /** Tiles whose water may still move (not saved: rebuilt from the water itself on load). */
  wet: Set<number>;
  /** Heat by tile index, worked out on demand (not saved; cleared whenever the mine changes). canon §15 */
  heat: Map<number, number>;
  /** What came up the shaft since the UI last looked (not saved; the UI reads and clears it). */
  hauled: Partial<Record<ResKey, number>>;
  /** The tally board's running counts (not saved). */
  tally?: Tally;
  /** M8-02: a Vein Break under way (not saved: a save mid-break just leaves the rest of the vein standing). */
  shatter?: { tiles: Tile[]; i: number; ms: number; m: number };
  /** M9-03: run time of the last miner Bunkhouse Roll hired. */
  rehiredAt?: number;
  /** M9-05: ahead of last run's ghost at the last step. */
  ahead?: boolean;
  /** M10-03: where Pell's dog is and what she is after (not saved: she starts by the Foreman on load). */
  dog?: { x: number; y: number; target: { x: number; y: number } | null; rest: number };
}

export function worldFor(state: GameState): World {
  const world = generateWorld(state.seed, {
    oldShaftD: state.world.oldShaftD,
    endlessRows: state.world.endlessRows,
  });
  for (const [k, m] of Object.entries(state.world.diffs)) world.mat[Number(k)] = m;
  for (const [k, v] of Object.entries(state.world.water)) world.water[Number(k)] = v;
  syncWorld(state, world);
  return world;
}

/** Copy the state's light-affecting facts onto the world: upgrades, Lumen, moth-dimmed lanterns. */
export function syncWorld(state: GameState, world: World): void {
  world.torchMult = torchMult(state);
  world.torchSteady = state.upgrades.steadyFlame === 1;
  world.lanternsLit = state.res.lumen.gt(0);
  world.soft = new Set(rootTiles(state, world));
  world.dimmed = new Set(state.pests.filter((p) => p.kind === 'moth').map((p) => p.y * world.w + p.x));
  world.touchAll();
}

/** Wire a world into a game so every change is recorded for the save and the reach cache. */
export function attach(g: Game, world: World): void {
  g.world = world;
  world.objects = g.state.world.objects;
  g.reach = new Uint8Array(world.w * world.h);
  g.reachDirty = true;
  g.heat = new Map();
  world.onSet = (i, m) => {
    g.state.world.diffs[String(i)] = m;
    g.reachDirty = true;
    g.heat.clear();
    // an opened or filled tile lets the water around it move again
    wakeWater(g, i);
    if (m !== M.AIR && world.water[i]) setWater(g, i, 0);
  };
  g.wet = new Set(wetTiles(world));
}

export function bind(state: GameState, world: World): Game {
  const g = {
    state,
    events: [],
    reachDirty: true,
    reachMaxY: 0,
    wet: new Set(),
    heat: new Map(),
    hauled: {},
    tally: newTally(state.t),
  } as unknown as Game;
  attach(g, world);
  return g;
}

/** Start a fresh world for the current state (new game or after a Cave-in). */
export function freshWorld(state: GameState): World {
  state.world.diffs = {};
  const world = worldFor(state);
  state.world.objects = { ...world.objects };
  return world;
}

export function createGame(seed: number): Game {
  const state = newGame(seed);
  return bind(state, freshWorld(state));
}

export function loadGame(state: GameState): Game {
  return bind(state, worldFor(state));
}

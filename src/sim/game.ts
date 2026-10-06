// A running game: the serialisable state plus the world rebuilt from it. dev-bible §1.1
import { generateWorld } from '../world/generator';
import type { World } from '../world/world';
import { UPGRADE_FX } from '../data/upgrades';
import { newGame, type GameState } from './state';

/** Something the renderer, audio or UI may want to react to. Never saved. */
export type SimEvent =
  | { kind: 'mined'; x: number; y: number; m: number; by: 'foreman' | 'miner' }
  | { kind: 'refused'; x: number; y: number; needs?: string }
  | { kind: 'drop'; x: number; y: number; res: string; n: number }
  | { kind: 'smelt'; bar: string }
  | { kind: 'bought'; what: string }
  | { kind: 'pest'; x: number; y: number; cleared: boolean }
  | { kind: 'chest'; x: number; y: number }
  | { kind: 'verse'; verse: number; x: number; y: number }
  | { kind: 'rush'; mult: number; x: number; y: number }
  | { kind: 'collapse'; x: number; y: number }
  | { kind: 'caveIn' };

export interface Game {
  state: GameState;
  world: World;
  events: SimEvent[];
  /** Air tiles connected to the shaft (1) — cached, rebuilt when the world changes. */
  reach: Uint8Array;
  reachDirty: boolean;
  /** Deepest row of the reach (valid after reach() runs). */
  reachMaxY: number;
  /** True while catching up on time away: pests and collapses wait for the player. */
  offline?: boolean;
}

export function worldFor(state: GameState): World {
  const world = generateWorld(state.seed, {
    oldShaftD: state.world.oldShaftD,
    endlessRows: state.world.endlessRows,
  });
  for (const [k, m] of Object.entries(state.world.diffs)) world.mat[Number(k)] = m;
  syncWorld(state, world);
  return world;
}

/** Copy the state's light-affecting facts onto the world: upgrades, Lumen, moth-dimmed lanterns. */
export function syncWorld(state: GameState, world: World): void {
  world.torchMult = state.upgrades.lamplit ? UPGRADE_FX.lamplit : 1;
  world.torchSteady = state.upgrades.steadyFlame === 1;
  world.lanternsLit = state.res.lumen.gt(0);
  world.dimmed = new Set(state.pests.filter((p) => p.kind === 'moth').map((p) => p.y * world.w + p.x));
  world.touchAll();
}

/** Wire a world into a game so every change is recorded for the save and the reach cache. */
export function attach(g: Game, world: World): void {
  g.world = world;
  world.objects = g.state.world.objects;
  g.reach = new Uint8Array(world.w * world.h);
  g.reachDirty = true;
  world.onSet = (i, m) => {
    g.state.world.diffs[String(i)] = m;
    g.reachDirty = true;
  };
}

export function bind(state: GameState, world: World): Game {
  const g = { state, events: [], reachDirty: true, reachMaxY: 0 } as unknown as Game;
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

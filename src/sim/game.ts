// A running game: the serialisable state plus the world rebuilt from it. dev-bible §1.1
import { generateWorld } from '../world/generator';
import type { World } from '../world/world';
import { newGame, type GameState } from './state';

/** Something the renderer, audio or UI may want to react to. Never saved. */
export type SimEvent =
  | { kind: 'mined'; x: number; y: number; m: number }
  | { kind: 'refused'; x: number; y: number }
  | { kind: 'drop'; x: number; y: number; res: string; n: number }
  | { kind: 'story' };

export interface Game {
  state: GameState;
  world: World;
  events: SimEvent[];
}

export function worldFor(state: GameState): World {
  const world = generateWorld(state.seed, {
    oldShaftD: state.world.oldShaftD,
    endlessRows: state.world.endlessRows,
  });
  for (const [k, m] of Object.entries(state.world.diffs)) world.mat[Number(k)] = m;
  world.touchAll();
  return world;
}

/** Wire the world to the state so every change is recorded for the save. */
export function bind(state: GameState, world: World): Game {
  world.objects = state.world.objects;
  world.onSet = (i, m) => {
    state.world.diffs[String(i)] = m;
  };
  return { state, world, events: [] };
}

export function createGame(seed: number): Game {
  const state = newGame(seed);
  const world = worldFor(state);
  state.world.objects = { ...world.objects };
  return bind(state, world);
}

export function loadGame(state: GameState): Game {
  return bind(state, worldFor(state));
}

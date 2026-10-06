// Browser persistence. Kept out of src/sim so the sim stays pure.
import { SAVE_KEY } from '../data/constants';
import type { GameState } from '../sim/state';
import { pack, unpack } from './codec';

export function saveLocal(state: GameState, now: number): void {
  state.savedAt = now;
  try {
    localStorage.setItem(SAVE_KEY, pack(state));
  } catch {
    // Storage full or blocked: the game keeps running and tries again at the next autosave.
  }
}

export function loadLocal(): GameState | null {
  let s: string | null = null;
  try {
    s = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (!s) return null;
  try {
    return unpack(s);
  } catch (e) {
    console.warn('Undersong: could not read the save', e);
    try {
      localStorage.setItem(SAVE_KEY + '.broken', s);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function wipeLocal(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

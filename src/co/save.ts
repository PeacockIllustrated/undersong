// The hybrid's save: its own key, so Holloway & Co. and Undersong never touch each other's progress (ADR-H001).
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { SAVE_KEY, SAVE_VERSION } from './data/co';
import { fromSave, toSave, type CoState } from './sim/state';

export interface Loaded {
  s: CoState;
  savedAt: number;
}

export function saveGame(s: CoState): void {
  try {
    localStorage.setItem(
      SAVE_KEY,
      compressToUTF16(JSON.stringify({ v: SAVE_VERSION, t: Date.now(), state: toSave(s) })),
    );
  } catch {
    // a private window or a full disk: the game plays on without saving
  }
}

export function loadGame(seed: number): Loaded | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const json = JSON.parse(decompressFromUTF16(raw) ?? 'null') as {
      v?: number;
      t?: number;
      state?: unknown;
    } | null;
    if (!json || typeof json !== 'object') return null;
    return { s: fromSave(json.state, seed), savedAt: typeof json.t === 'number' ? json.t : 0 };
  } catch {
    return null;
  }
}

export function wipeGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // nothing to wipe
  }
}

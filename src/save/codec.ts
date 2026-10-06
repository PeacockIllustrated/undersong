// Save encoding: JSON with Decimals tagged, compressed with lz-string, versioned. dev-bible §1.5
import LZString from 'lz-string';
import { Decimal } from '../sim/decimal';
import { SAVE_VERSION, type GameState } from '../sim/state';
import { migrate } from './migrations';

const TAG = 'D:';

export function toJSON(state: GameState): string {
  // Decimal has its own toJSON, so look at the raw value on the holder, not the already-converted one.
  return JSON.stringify(state, function (this: Record<string, unknown>, k: string, v: unknown) {
    const raw = this[k];
    return raw instanceof Decimal ? TAG + raw.toString() : v;
  });
}

export function fromJSON(text: string): GameState {
  const raw = JSON.parse(text, (_k, v: unknown) =>
    typeof v === 'string' && v.startsWith(TAG) ? new Decimal(v.slice(TAG.length)) : v,
  ) as unknown;
  if (!raw || typeof raw !== 'object' || typeof (raw as { v?: unknown }).v !== 'number')
    throw new Error('This does not look like an Undersong save.');
  const state = migrate(raw as { v: number } & Record<string, unknown>);
  if (state.v !== SAVE_VERSION) throw new Error(`Save version ${state.v} is newer than this game.`);
  return state;
}

/** Compact string for localStorage. */
export function pack(state: GameState): string {
  return LZString.compressToUTF16(toJSON(state));
}

export function unpack(s: string): GameState {
  const json = LZString.decompressFromUTF16(s);
  if (!json) throw new Error('The save is empty or damaged.');
  return fromJSON(json);
}

/** Copy-and-paste export string. */
export function exportString(state: GameState): string {
  return LZString.compressToBase64(toJSON(state));
}

export function importString(s: string): GameState {
  const json = LZString.decompressFromBase64(s.trim());
  if (!json) throw new Error('That export string is empty or damaged.');
  return fromJSON(json);
}

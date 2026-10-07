// Save encoding: JSON with Decimals tagged, compressed with lz-string, versioned. dev-bible §1.5
import LZString from 'lz-string';
import { Decimal } from '../sim/decimal';
import { SAVE_VERSION, type GameState } from '../sim/state';
import { migrate } from './migrations';
import { ftFromDepthTiles } from '../data/constants';

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

/** M12-01: an export string, or the plain JSON of a save. Checked before it is handed back. */
export function importString(s: string): GameState {
  const t = s.trim();
  const json = t.startsWith('{') ? t : LZString.decompressFromBase64(t);
  if (!json) throw new Error('That export string is empty or damaged.');
  const state = fromJSON(json);
  checkSave(state);
  return state;
}

/** M12-01: the parts of a save the game can't run without. Throws a readable error naming the first one missing. */
export function checkSave(s: GameState): void {
  const bad = (what: string): never => {
    throw new Error(`The save is missing its ${what}.`);
  };
  if (typeof s.seed !== 'number' || !Number.isFinite(s.seed)) bad('seed');
  if (!s.res || !(s.res.copperOre instanceof Decimal)) bad('resources');
  if (!(s.echoes instanceof Decimal)) bad('Echoes');
  if (!s.foreman || typeof s.foreman.x !== 'number' || typeof s.foreman.y !== 'number') bad('Foreman');
  if (!Array.isArray(s.verses?.known) || s.verses.known.length !== 12) bad('verses');
  if (!s.world || typeof s.world.diffs !== 'object') bad('mountain');
  if (!Array.isArray(s.survey) || !Array.isArray(s.miners)) bad('Survey Book');
}

/** M12-01: what a save holds, to show before it replaces the game. */
export function saveSummary(s: GameState): {
  cycle: number;
  bestFt: number;
  echoes: Decimal;
  verses: number;
} {
  return {
    cycle: s.cycle,
    bestFt: ftFromDepthTiles(s.stats.bestDepthD),
    echoes: s.echoes.floor(),
    verses: s.verses.known.filter(Boolean).length,
  };
}

/** M12-01: a file name for a downloaded save, dated. */
export const saveFileName = (now: Date): string => `undersong-save-${now.toISOString().slice(0, 10)}.txt`;

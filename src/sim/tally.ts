// The tally board (M6-06, canon §17): what each source brought in, per second, over the last minute or two.
// Lives on the Game, not the save: it is a reading, and refills within a minute of loading.
import { TALLY } from '../data/surface';
import type { Game } from './game';

export const TALLY_SOURCES = ['foreman', 'miners', 'chests', 'fields', 'woodlot'] as const;
export type TallySource = (typeof TALLY_SOURCES)[number];
type Counts = Record<TallySource, number>;

export interface Tally {
  /** Run time (ms) the current window began. */
  start: number;
  cur: Counts;
  /** The window before, and how long it ran (ms). */
  prev: Counts | null;
  prevMs: number;
}

const zero = (): Counts => ({ foreman: 0, miners: 0, chests: 0, fields: 0, woodlot: 0 });

export const newTally = (t: number): Tally => ({ start: t, cur: zero(), prev: null, prevMs: 0 });

function roll(g: Game): Tally {
  const t = g.state.t;
  let k = g.tally;
  // a Cave-in sets run time back to 0: start over
  if (!k || t < k.start) k = g.tally = newTally(t);
  if (t - k.start >= TALLY.windowS * 1000) {
    k.prev = k.cur;
    k.prevMs = t - k.start;
    k.cur = zero();
    k.start = t;
  }
  return k;
}

/** Count n goods brought in by one source. */
export function tally(g: Game, src: TallySource, n: number): void {
  roll(g).cur[src] += n;
}

/** Goods per second from each source, or null until a few seconds have been counted. */
export function tallyRates(g: Game): Counts | null {
  const k = roll(g);
  const ms = g.state.t - k.start + k.prevMs;
  if (ms < 5000) return null;
  const out = zero();
  for (const src of TALLY_SOURCES) out[src] = ((k.cur[src] + (k.prev?.[src] ?? 0)) * 1000) / ms;
  return out;
}

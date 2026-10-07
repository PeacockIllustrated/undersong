// Holloway & Co. game state. The save holds the village (meta) and the contract; a day is rebuilt from its seed.
import { D, ZERO, type Decimal } from '../../sim/decimal';
import type { World } from '../../world/world';
import { BOOK, SHOP, type BookId, type RelicId, type ShopId } from '../data/co';
import type { Body } from './body';

export type Phase = 'title' | 'day' | 'dusk' | 'night' | 'cavein';

export interface Meta {
  echoes: Decimal;
  echoesEver: Decimal;
  contracts: number;
  bestDay: number;
  book: Record<BookId, number>;
  /** Every verse ever found (0-based). Each speeds every crew (canon §4.13). */
  verses: number[];
}

export interface Contract {
  n: number;
  seed: number;
  day: number;
  scrip: Decimal;
  /** All coal deposited this contract: the Echo formula reads it. */
  coal: Decimal;
  /** Days whose quota was met. */
  survived: number;
  versesFound: number[];
  pardonsUsed: number;
  relics: RelicId[];
  levels: Record<ShopId, number>;
}

export interface Tally {
  day: number;
  quota: Decimal;
  deposited: Decimal;
  byHand: Decimal;
  byCrew: Decimal;
  late: Decimal;
  oreScrip: Decimal;
  chestScrip: Decimal;
  surplusScrip: Decimal;
  passed: boolean;
  pardoned: boolean;
}

export interface CaveIn {
  contract: number;
  days: number;
  coal: Decimal;
  verses: number;
  echoes: Decimal;
}

export interface CoState {
  phase: Phase;
  meta: Meta;
  contract: Contract;
  /** mulberry32 state for chests and relics. */
  rng: number;
  tally: Tally | null;
  caveIn: CaveIn | null;
}

export interface Bomb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuse: number;
}

export interface Gang {
  /** Row the gang works (the tunnel floor), side (−1 left, 1 right), and the face column. */
  y: number;
  side: -1 | 1;
  x: number;
  work: number;
  count: number;
  stuck: boolean;
}

export type CoEvent =
  | { t: 'break'; x: number; y: number; m: number; coal: number; ore: number; rush: number }
  | { t: 'chip'; x: number; y: number; m: number }
  | { t: 'refused'; x: number; y: number }
  | { t: 'full' }
  | { t: 'deposit'; coal: Decimal; scrip: Decimal; x: number; y: number }
  | { t: 'chest'; x: number; y: number; scrip: Decimal; relic: RelicId | null }
  | { t: 'verse'; verse: number; first: boolean }
  | { t: 'boom'; x: number; y: number; r: number }
  | { t: 'lastBell' }
  | { t: 'quotaMet' }
  | { t: 'dusk' }
  | { t: 'jump' }
  | { t: 'land'; speed: number }
  | { t: 'ladder'; x: number; y: number };

/** One day underground. Never saved: a reload mid-day starts that day again at dawn. */
export interface DayRun {
  t: number;
  length: number;
  quota: Decimal;
  deposited: Decimal;
  byHand: Decimal;
  byCrew: Decimal;
  oreScrip: Decimal;
  chestScrip: Decimal;
  body: Body;
  pack: { coal: Decimal; ore: number; oreScrip: Decimal };
  ladders: number;
  charges: number;
  dig: { x: number; y: number; t: number; need: number } | null;
  rush: { chain: number; x: number; y: number; idle: number };
  bombs: Bomb[];
  gangs: Gang[];
  /** Coal from the crew not yet shown as a pop at the kibble (render only reads it). */
  crewPop: number;
  bell: boolean;
  met: boolean;
  /** Seconds since dusk, while the tally is read. */
  dusk: number;
  /** Time since the last refused or full warning, so they don't repeat every frame. */
  warnT: number;
  /** Coal banked at half from the pack at dusk. */
  late: Decimal;
}

export interface Game {
  s: CoState;
  day: DayRun | null;
  world: World | null;
  events: CoEvent[];
}

const zeroLevels = (): Record<ShopId, number> =>
  Object.fromEntries(SHOP.map((d) => [d.id, 0])) as Record<ShopId, number>;
const zeroBook = (): Record<BookId, number> =>
  Object.fromEntries(BOOK.map((d) => [d.id, 0])) as Record<BookId, number>;

export function newContract(n: number, seed: number): Contract {
  return {
    n,
    seed,
    day: 1,
    scrip: ZERO(),
    coal: ZERO(),
    survived: 0,
    versesFound: [],
    pardonsUsed: 0,
    relics: [],
    levels: zeroLevels(),
  };
}

export function newState(seed: number): CoState {
  return {
    phase: 'title',
    meta: { echoes: ZERO(), echoesEver: ZERO(), contracts: 0, bestDay: 0, book: zeroBook(), verses: [] },
    contract: newContract(1, seed),
    rng: seed ^ 0x9e3779b9,
    tally: null,
    caveIn: null,
  };
}

export function newGame(seed: number): Game {
  return { s: newState(seed), day: null, world: null, events: [] };
}

/** Plain JSON for the save: Decimals as strings. */
export function toSave(s: CoState): unknown {
  return JSON.parse(
    JSON.stringify(s, (_k, v: unknown) =>
      v && typeof v === 'object' && 'mantissa' in v && 'exponent' in v ? String(v) : v,
    ),
  );
}

const DEC_META = ['echoes', 'echoesEver'] as const;
const DEC_CONTRACT = ['scrip', 'coal'] as const;
const DEC_TALLY = [
  'quota',
  'deposited',
  'byHand',
  'byCrew',
  'late',
  'oreScrip',
  'chestScrip',
  'surplusScrip',
] as const;

/** Rebuild a state from save JSON, filling anything missing from a fresh state. */
export function fromSave(raw: unknown, seed: number): CoState {
  const fresh = newState(seed);
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Partial<Record<keyof CoState, unknown>>;
  const s: CoState = {
    ...fresh,
    phase: (['title', 'day', 'dusk', 'night', 'cavein'] as const).includes(r.phase as Phase)
      ? (r.phase as Phase)
      : 'title',
    rng: typeof r.rng === 'number' ? r.rng : fresh.rng,
    meta: { ...fresh.meta, ...(r.meta as object) } as Meta,
    contract: { ...fresh.contract, ...(r.contract as object) } as Contract,
    tally: (r.tally as Tally | null) ?? null,
    caveIn: (r.caveIn as CaveIn | null) ?? null,
  };
  s.meta.book = { ...zeroBook(), ...s.meta.book };
  s.contract.levels = { ...zeroLevels(), ...s.contract.levels };
  for (const k of DEC_META) s.meta[k] = D(s.meta[k] ?? 0);
  for (const k of DEC_CONTRACT) s.contract[k] = D(s.contract[k] ?? 0);
  if (s.tally) for (const k of DEC_TALLY) s.tally[k] = D(s.tally[k] ?? 0);
  if (s.caveIn) {
    s.caveIn.coal = D(s.caveIn.coal ?? 0);
    s.caveIn.echoes = D(s.caveIn.echoes ?? 0);
  }
  // a day in progress is played again from dawn; dusk is settled on load by the caller
  return s;
}

// One migration per SAVE_VERSION bump. Players never lose a save (golden rule 5).
import { newGame, SAVE_VERSION, type GameState } from '../sim/state';

type Raw = { v: number } & Record<string, unknown>;

/** MIGRATIONS[n] upgrades a version-n save to n + 1. */
const MIGRATIONS: Record<number, (s: Raw) => Raw> = {};

export function migrate(raw: Raw): GameState {
  let s = raw;
  while (s.v < SAVE_VERSION) {
    const m = MIGRATIONS[s.v];
    if (!m) throw new Error(`No migration from save version ${s.v}.`);
    s = m(s);
  }
  // Fill any field a save is missing with the new-game default, so additive changes stay safe.
  const base = newGame(typeof s.seed === 'number' ? s.seed : 1) as unknown as Record<string, unknown>;
  for (const k of Object.keys(base)) if (!(k in s)) s[k] = base[k];
  return s as unknown as GameState;
}

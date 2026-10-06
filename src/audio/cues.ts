// Which sounds a sim event makes (ADR-027). Pure, so it can be tested without a browser.
import { M } from '../data/materials';
import { MATERIALS } from '../data/materials';
import { RUSH_SEMITONES, RUSH_SEMITONES_MAX, VERSE_MOTIF, VERSE_PHRASE, type CueId } from '../data/sounds';
import type { SimEvent } from '../sim/game';

export interface Play {
  id: CueId;
  /** Pitch multiplier (1 = as written). */
  pitch?: number;
}

/** A semitone as a pitch multiplier. */
export const semis = (n: number): number => 2 ** (n / 12);

const RINGING: ReadonlySet<number> = new Set([M.CRYSTAL, M.SINGING, M.AQUA, M.HEART]);
const SOFT: ReadonlySet<number> = new Set([M.DIRT, M.GRASS, M.RUBBLE]);

/** The crunch for breaking a material. */
export function breakCue(m: number): CueId {
  if (RINGING.has(m)) return 'breakCrystal';
  if (SOFT.has(m)) return 'breakSoft';
  return MATERIALS[m]?.isOre ? 'breakOre' : 'breakStone';
}

/**
 * Sounds for one sim event. `seen` says whether the event's tile is on screen: a miner far off is not heard.
 * The Vein Rush chain raises the drop chime; `chain` is the Foreman's current chain.
 */
export function cuesFor(e: SimEvent, seen: boolean, chain: number): Play[] {
  switch (e.kind) {
    case 'mined':
      if (e.by === 'foreman') return [{ id: breakCue(e.m) }];
      return seen ? [{ id: 'breakFar' }] : [];
    case 'drop':
      return [{ id: 'drop', pitch: semis(Math.min(RUSH_SEMITONES_MAX, chain * RUSH_SEMITONES)) }];
    case 'smelt':
      return [{ id: 'smelt' }];
    // the surface reuses the drop and the chest (canon §16): a golden ear sounds like a find
    case 'harvest':
      return [{ id: e.golden ? 'chest' : 'drop' }];
    case 'chop':
      return [{ id: 'breakSoft' }];
    case 'bought':
      return [{ id: 'bought' }];
    case 'refused':
      return [{ id: 'refused' }];
    case 'pest':
      return e.cleared ? [{ id: 'pestCleared' }] : seen ? [{ id: 'pest' }] : [];
    case 'chest':
      return [{ id: 'chest' }];
    case 'record':
      return [{ id: 'record' }];
    case 'collapse':
      return [{ id: 'collapse' }];
    case 'caveIn':
      return [{ id: 'caveIn' }];
    // a verse plays its phrase of the song (verseNotes); a rush is heard through the drop's pitch
    case 'verse':
    case 'rush':
      return [];
  }
}

/** The notes of the song a verse plays: the song so far, ending on this verse's own note. */
export function verseNotes(verse: number): number[] {
  const end = Math.max(0, Math.min(VERSE_MOTIF.length - 1, verse));
  return VERSE_MOTIF.slice(Math.max(0, end - VERSE_PHRASE + 1), end + 1);
}

/** Lets a cue through only if its last play was at least `gap` ms ago. */
export class Throttle {
  private last = new Map<string, number>();
  allow(id: string, gap: number, now: number): boolean {
    const t = this.last.get(id);
    if (t !== undefined && now - t < gap) return false;
    this.last.set(id, now);
    return true;
  }
}

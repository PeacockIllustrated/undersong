// M13-03: everything that flashes up on screen, kept so nothing that flashed past is lost. Apart from the save.
import { LATELY_KEEP } from '../data/ui';

export interface LatelyLine {
  big: string;
  sub: string;
  /** Wall-clock ms. */
  at: number;
}

export const LATELY_KEY = 'undersong.lately';

let lines: LatelyLine[] = load();

function load(): LatelyLine[] {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(LATELY_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (l): l is LatelyLine =>
          !!l && typeof l.big === 'string' && typeof l.sub === 'string' && typeof l.at === 'number',
      )
      .slice(0, LATELY_KEEP);
  } catch {
    return [];
  }
}

/** Newest first. */
export function lately(): readonly LatelyLine[] {
  return lines;
}

export function remember(big: string, sub: string, at: number): void {
  // the same toast again straight after itself (a held buy) is one line, freshened
  const top = lines[0];
  if (top && top.big === big) lines = [{ big, sub, at }, ...lines.slice(1)];
  else lines = [{ big, sub, at }, ...lines].slice(0, LATELY_KEEP);
  try {
    localStorage.setItem(LATELY_KEY, JSON.stringify(lines));
  } catch {
    // private mode or full storage: the list still works for this visit
  }
}

/** For tests. */
export function forgetAll(): void {
  lines = [];
}

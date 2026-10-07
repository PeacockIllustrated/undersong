// M9-03 and M9-05: the bunkhouse remembers last run's crew, and the run races last run's depth. canon §20
import { GHOST, REHIRE_EVERY_MS } from '../data/memory';
import type { Game } from './game';
import { apply } from './actions';
import { canPay, minerCost } from './economy';

/** Minutes ahead of the last run at this depth (positive), behind (negative), or null with no last run to race. */
export function aheadOfLast(s: Game['state']): number | null {
  const last = s.lastRun.depthByMin;
  if (s.cycle < 2 || !last.length) return null;
  const now = Math.floor(s.t / 60_000);
  const i = last.findIndex((d) => d >= s.stats.maxDepthD);
  // last run never got this deep: as far ahead as it ran
  if (i < 0) return last.length - now;
  return i - now;
}

/** The ghost's depth (tiles) at this minute of the run, or null. */
export function ghostDepth(s: Game['state']): number | null {
  const last = s.lastRun.depthByMin;
  if (s.cycle < 2 || !last.length) return null;
  return last[Math.min(last.length - 1, Math.floor(s.t / 60_000))]!;
}

export function stepMemory(g: Game): void {
  const s = g.state;
  // the run's depth by minute (offline steps can skip minutes: fill them with what was reached)
  const m = Math.floor(s.t / 60_000);
  if (m < GHOST.capMin) {
    while (s.runDepth.length < m) s.runDepth.push(s.runDepth[s.runDepth.length - 1] ?? s.stats.maxDepthD);
    s.runDepth[m] = Math.max(s.runDepth[m] ?? 0, s.stats.maxDepthD);
  }
  // Bunkhouse Roll: last run's miners come back as bars allow
  if (
    s.upgrades.bunkhouseRoll &&
    s.miners.length < s.lastRun.miners &&
    s.t - (g.rehiredAt ?? -Infinity) >= REHIRE_EVERY_MS
  ) {
    const c = minerCost(s);
    if (canPay(s, [{ res: c.res, amount: c.amount }])) {
      apply(g, { type: 'hireMiner' });
      g.rehiredAt = s.t;
    }
  }
  // passing last run's ghost
  const a = aheadOfLast(s);
  const ahead = a !== null && a >= 1;
  if (ahead && !g.ahead && !g.offline) g.events.push({ kind: 'ahead', min: a });
  g.ahead = ahead;
}

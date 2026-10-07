// M8-03: how fast each resource is coming in, for "ready in". UI-side: it watches the numbers the HUD already shows.
// Only gains count (spending is the player's choice, not a slower income), over the last RATE_WINDOW_S seconds.
import type { ResKey } from '../data/resources';
import { RATE_WINDOW_S } from '../data/ui';
import type { GameState } from '../sim/state';

let last: Partial<Record<ResKey, number>> | null = null;
let lastT = 0;
const gains: { t: number; d: Partial<Record<ResKey, number>> }[] = [];

/** Call about once a second with the live state and its sim time (ms). */
export function sampleRates(s: GameState): void {
  if (last && s.t - lastT < 1000) return;
  const now: Partial<Record<ResKey, number>> = {};
  for (const k of Object.keys(s.res) as ResKey[]) now[k] = s.res[k].toNumber();
  if (last && s.t > lastT) {
    const d: Partial<Record<ResKey, number>> = {};
    for (const k of Object.keys(now) as ResKey[]) {
      const g = (now[k] ?? 0) - (last[k] ?? 0);
      if (g > 0) d[k] = g;
    }
    gains.push({ t: s.t, d });
    while (gains.length && gains[0]!.t < s.t - RATE_WINDOW_S * 1000) gains.shift();
  } else gains.length = 0;
  last = now;
  lastT = s.t;
}

/** Gain per second of one resource, 0 when none has come in lately. */
export function rateOf(k: ResKey): number {
  if (gains.length < 2) return 0;
  const span = (gains[gains.length - 1]!.t - gains[0]!.t) / 1000 + 1;
  let sum = 0;
  for (const g of gains) sum += g.d[k] ?? 0;
  return sum / span;
}

/** Seconds until every cost can be paid at current income, or the resource with no income. */
export function readyIn(
  costs: readonly { res: ResKey; amount: { toNumber(): number } }[],
  s: GameState,
): { secs: number } | { needs: ResKey } {
  let secs = 0;
  for (const c of costs) {
    const short = c.amount.toNumber() - s.res[c.res].toNumber();
    if (short <= 0) continue;
    const r = rateOf(c.res);
    if (r <= 0) return { needs: c.res };
    secs = Math.max(secs, short / r);
  }
  return { secs };
}

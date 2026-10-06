// Offline progress: the village keeps digging while the tab is closed. canon §4.8
import { RES_KEYS, type ResKey } from '../data/resources';
import { OFFLINE } from '../data/upgrades';
import type { Decimal } from '../sim/decimal';
import type { Game } from '../sim/game';
import { step } from '../sim/step';
import { TICK_MS } from '../data/constants';

export interface AwaySummary {
  /** Wall-clock time away, in seconds. */
  awayS: number;
  /** Village time it counted for, after the cap and efficiency. */
  creditedS: number;
  gains: { res: ResKey; n: Decimal }[];
  tiles: number;
  /** Deepest point reached while away, in tiles, if it grew. */
  deeperD: number | null;
}

/** Most sim steps a catch-up may take; longer absences use longer steps. */
const MAX_STEPS = 1200;

/**
 * canon §4.8: credit `min(t, cap) × eff` of village time, simulated in coarse steps with pests and collapses held off.
 * Absences under a minute play on in full.
 */
export function catchUp(g: Game, awayMs: number): AwaySummary | null {
  if (!(awayMs > 0)) return null;
  if (awayMs < OFFLINE.minS * 1000) {
    // a quick look at another app: the village simply played on, at full speed and with no summary (ADR-026)
    for (let t = TICK_MS; t <= awayMs; t += TICK_MS) step(g, TICK_MS);
    g.events.length = 0;
    return null;
  }
  const s = g.state;
  const long = s.upgrades.longShift === 1;
  const capMs = (long ? OFFLINE.longShift.capH : OFFLINE.capH) * 3600_000;
  const eff = long ? OFFLINE.longShift.eff : OFFLINE.eff;
  const simMs = Math.floor((Math.min(awayMs, capMs) * eff) / 100) * 100;
  const dtMs = Math.max(OFFLINE.stepS * 1000, Math.ceil(simMs / MAX_STEPS / 100) * 100);

  const before = Object.fromEntries(RES_KEYS.map((k) => [k, s.res[k]])) as Record<ResKey, Decimal>;
  const tiles0 = s.stats.tilesMined;
  const depth0 = s.stats.maxDepthD;
  g.offline = true;
  try {
    for (let t = 0; t < simMs; t += dtMs) step(g, Math.min(dtMs, simMs - t));
  } finally {
    g.offline = false;
  }
  g.events.length = 0;

  const gains = RES_KEYS.filter((k) => s.res[k].gt(before[k])).map((k) => ({
    res: k,
    n: s.res[k].sub(before[k]),
  }));
  return {
    awayS: Math.floor(awayMs / 1000),
    creditedS: Math.floor(simMs / 1000),
    gains,
    tiles: s.stats.tilesMined - tiles0,
    deeperD: s.stats.maxDepthD > depth0 ? s.stats.maxDepthD : null,
  };
}

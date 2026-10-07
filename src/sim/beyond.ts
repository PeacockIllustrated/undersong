// M11 Beyond the song: Endless Depth markers, deep picks, Auto Cave-in and the keys of New Song+. Pure. canon §22
import { AUTO_CAVEIN, DEEP_PICK, ENDLESS_MARK, KEYS, type KeyId } from '../data/beyond';
import { HEART_FLOOR_D } from '../data/constants';
import { PICKS } from '../data/items';
import type { ResKey } from '../data/resources';
import { caveIn, canCaveIn, echoGain } from './cavein';
import { endingReady } from './ending';
import { D, type Decimal } from './decimal';
import type { Game } from './game';
import { hash3 } from './rng';
import type { GameState } from './state';
import { first, say } from './story';

// ---------- markers ----------

/** Depth (tiles) of Endless Depth marker k, from 1. */
export const markerD = (k: number): number => HEART_FLOOR_D + k * ENDLESS_MARK.everyD;

/** Markers this run has reached. Below the Heart floor is bedrock until the shaft is sealed. */
export function markersReached(s: GameState): number {
  if (s.ending !== 'seal') return 0;
  return Math.max(0, Math.floor((s.stats.maxDepthD - HEART_FLOOR_D) / ENDLESS_MARK.everyD));
}

/** What marker k pays: Echoes and gold bars, each ×grow on the one before. */
export function markerReward(k: number): { echoes: number; gold: number } {
  const g = Math.pow(ENDLESS_MARK.grow, k - 1);
  return { echoes: Math.round(ENDLESS_MARK.echoes * g), gold: Math.round(ENDLESS_MARK.gold * g) };
}

/** Pay every marker reached for the first time. Each pays once, ever. */
export function stepMarkers(g: Game): void {
  const s = g.state;
  const k = markersReached(s);
  while (s.endlessPaid < k) {
    const n = ++s.endlessPaid;
    const r = markerReward(n);
    s.echoes = s.echoes.add(r.echoes);
    s.echoesEver = s.echoesEver.add(r.echoes);
    s.res.goldBar = s.res.goldBar.add(r.gold);
    g.events.push({ kind: 'marker', k: n, echoes: r.echoes, gold: r.gold });
    first(g, 'marker');
    say(g, 'marker');
  }
}

// ---------- deep picks ----------

/** Deep pick n's power multiplier on the Heart pick. */
export const deepPickMult = (s: GameState): number => Math.pow(DEEP_PICK.mult, s.deepPick);

/** The next deep pick's cost, or null while the Heart pick is still to make. */
export function deepPickCost(s: GameState): { res: ResKey; amount: Decimal }[] | null {
  if (s.pickTier < PICKS.length - 1) return null;
  const k = Math.pow(DEEP_PICK.grow, s.deepPick);
  return DEEP_PICK.cost.map((c) => ({ res: c.res, amount: D(Math.round(c.n * k)) }));
}

/** The next deep pick can be made once its marker has been reached this run. */
export const deepPickOpen = (s: GameState): boolean =>
  deepPickCost(s) !== null && markersReached(s) > s.deepPick;

// ---------- Auto Cave-in ----------

/** Auto Cave-in is offered once the ending has been reached. */
export const autoOffered = (s: GameState): boolean => s.ending !== null;

/** Track the best Echo offer this run; cave in once it has stood still for AUTO_CAVEIN.stallMs. Not while away. */
export function stepAuto(g: Game): void {
  const s = g.state;
  // never ahead of the ending's choice
  if (!s.auto.caveIn || !autoOffered(s) || g.offline || !canCaveIn(s) || endingReady(s)) return;
  const offer = echoGain(s).toNumber();
  if (offer > s.auto.best) {
    s.auto.best = offer;
    s.auto.since = s.t;
    return;
  }
  if (s.t - s.auto.since < AUTO_CAVEIN.stallMs) return;
  if (caveIn(g)) {
    // no ceremony for a Cave-in nobody asked for; the Survey Book page says it was the village's own
    s.story.events = s.story.events.filter((e) => e.kind !== 'caveIn');
    s.survey[s.survey.length - 1]!.auto = true;
    g.events.push({ kind: 'autoCaveIn', echoes: offer });
    say(g, 'autoCaveIn');
  }
}

// ---------- keys ----------

/** The key the next song would set: picked from the cycle, never the key this mountain is already in. */
export function nextKey(s: GameState): KeyId {
  const pool = KEYS.filter((k) => k !== s.songKey);
  return pool[Math.floor(hash3(s.ngPlus, s.cycle, 0x6b6579) * pool.length) % pool.length]!;
}

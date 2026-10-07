// Reading the game for the player: what is holding the village back, and what can be bought now. ADR-020
import { HEAT } from '../data/heat';
import { lightFactor } from '../data/light';
import { HELPERS } from '../data/helpers';
import { BUILDINGS, METALWORK } from '../data/economy';
import { HAULED } from '../data/resources';
import { UPGRADES } from '../data/upgrades';
import {
  canPay,
  haulRate,
  metalworkCost,
  metalworkOffered,
  minerCost,
  nextHaul,
  nextPick,
  whetstoneCost,
} from '../sim/economy';
import { helperCost, helperOffered } from '../sim/helpers';
import { buildingCost, buildingOffered } from '../sim/village';
import { mealCost, plotCost, saplingCost } from '../sim/surface';
import { MEALS } from '../data/surface';
import { minerOreRate } from '../sim/miners';
import type { Game } from '../sim/game';

/** M8-06: where tapping the alert takes you: a card in the Village, or a place in the mine. */
export type Fix = { card: 'haul' | 'pick' | 'lampworks' } | { x: number; y: number };

export interface Bottleneck {
  what: string;
  hint: string;
  fix: Fix;
}

/** The one thing most worth fixing right now, or null when the village is humming. */
export function bottleneck(g: Game): Bottleneck | null {
  const s = g.state;
  const w = g.world;
  if (!s.miners.length) return null;
  const stalled = s.miners.filter((m) => m.stalledBy !== null).length;
  const stuck = s.miners.find((m) => m.stalledBy !== null);
  const pest = stuck && s.pests.find((p) => p.id === stuck.stalledBy);
  if (stalled * 2 >= s.miners.length)
    return {
      fix: pest ? { x: pest.x, y: pest.y } : { x: stuck!.x, y: stuck!.y },
      what: 'Pests',
      hint: `${stalled} of ${s.miners.length} miner${s.miners.length > 1 ? 's' : ''} ${stalled > 1 ? 'are' : 'is'} stopped. Tap the pests, or hire Pell’s rounds.`,
    };
  const waiting = HAULED.reduce((a, k) => a + s.underground[k].toNumber(), 0);
  if (waiting > 30 && haulRate(g) < minerOreRate(g))
    return {
      fix: { card: 'haul' },
      what: 'Haulage',
      hint: `${Math.floor(waiting)} ore is piling up at the bottom. A better lift brings it up faster.`,
    };
  const working = s.miners.filter((m) => m.target);
  const darkOnes = working.filter((m) => lightFactor(w.faceLight(m.target!.x, m.target!.y)) < 1);
  const dark = darkOnes.length;
  if (working.length && dark * 2 >= working.length)
    return {
      fix: { x: darkOnes[0]!.target!.x, y: darkOnes[0]!.target!.y },
      what: 'Light',
      hint: `${dark} miners are working in the dark at reduced speed. Light their faces.`,
    };
  const idle = s.miners.length - working.length - stalled;
  const idler = s.miners.find((m) => !m.target && m.stalledBy === null);
  if (
    idle * 2 >= s.miners.length &&
    s.story.seen.includes('tooHot') &&
    g.world.depth(g.reachMaxY) >= HEAT.fromD
  )
    return {
      fix: idler ? { x: idler.x, y: idler.y } : { card: 'pick' },
      what: 'Heat',
      hint: 'Miners won’t work faces that hot. Set cooling vents, or hire Wren’s cold lamps.',
    };
  if (idle * 2 >= s.miners.length)
    return {
      fix: { card: 'pick' },
      what: 'Nothing to dig',
      hint: 'Miners are idle: open new faces, or a better pick lets them break harder rock.',
    };
  return null;
}

/** Anything in the village the player can buy right now (not counting crafts). */
export function villageAffordable(g: Game): boolean {
  const s = g.state;
  const mc = minerCost(s);
  if (s.res[mc.res].gte(mc.amount)) return true;
  if (canPay(s, whetstoneCost(s))) return true;
  if (METALWORK.some((m) => metalworkOffered(s, m.id) && canPay(s, metalworkCost(s, m.id)))) return true;
  const p = nextPick(s);
  if (p && canPay(s, p)) return true;
  const h = nextHaul(s);
  if (h && canPay(s, h)) return true;
  if (BUILDINGS.some((b) => buildingOffered(s, b.id) && canPay(s, buildingCost(s, b.id)))) return true;
  return HELPERS.some((hp) => {
    const c = helperCost(s, hp.id);
    return helperOffered(s, hp.id) && !!c && canPay(s, c);
  });
}

/** M8-01: anything on the surface the player can buy now: a plot, a meal, a sapling. */
export function surfaceAffordable(g: Game): boolean {
  const s = g.state;
  const ok = (c: ReturnType<typeof plotCost>): boolean => !!c && canPay(s, c);
  if (s.surface.tansy && (ok(plotCost(s)) || MEALS.some((m) => ok(mealCost(s, m.id))))) return true;
  return s.surface.rook && ok(saplingCost(s));
}

export function echoAffordable(g: Game): boolean {
  const s = g.state;
  return UPGRADES.some(
    (u) => !s.upgrades[u.id] && (!u.requires || s.upgrades[u.requires]) && s.echoes.gte(u.cost),
  );
}

/** A big centre-screen announcement: purchases, records, Homecoming. */
export function toast(big: string, sub = ''): void {
  window.dispatchEvent(new CustomEvent('undersong:toast', { detail: { big, sub } }));
}

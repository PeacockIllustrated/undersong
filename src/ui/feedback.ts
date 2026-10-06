// Reading the game for the player: what is holding the village back, and what can be bought now. ADR-020
import { lightFactor } from '../data/light';
import { HELPERS } from '../data/helpers';
import { BUILDINGS } from '../data/economy';
import { HAULED } from '../data/resources';
import { UPGRADES } from '../data/upgrades';
import { canPay, haulRate, minerCost, nextHaul, nextPick, whetstoneCost } from '../sim/economy';
import { helperCost, helperOffered } from '../sim/helpers';
import { buildingCost, buildingOffered } from '../sim/village';
import { minerRate } from '../sim/miners';
import type { Game } from '../sim/game';

export interface Bottleneck {
  what: string;
  hint: string;
}

/** The one thing most worth fixing right now, or null when the village is humming. */
export function bottleneck(g: Game): Bottleneck | null {
  const s = g.state;
  const w = g.world;
  if (!s.miners.length) return null;
  const stalled = s.miners.filter((m) => m.stalledBy !== null).length;
  if (stalled * 2 >= s.miners.length)
    return {
      what: 'Pests',
      hint: `${stalled} of ${s.miners.length} miner${s.miners.length > 1 ? 's' : ''} ${stalled > 1 ? 'are' : 'is'} stopped. Tap the pests, or hire Pell’s rounds.`,
    };
  const waiting = HAULED.reduce((a, k) => a + s.underground[k].toNumber(), 0);
  const dig = s.miners.reduce((a, m) => a + minerRate(g, m), 0);
  if (waiting > 30 && haulRate(g) < dig)
    return {
      what: 'Haulage',
      hint: `${Math.floor(waiting)} ore is piling up at the bottom. A better lift brings it up faster.`,
    };
  const working = s.miners.filter((m) => m.target);
  const dark = working.filter((m) => lightFactor(w.faceLight(m.target!.x, m.target!.y)) < 1).length;
  if (working.length && dark * 2 >= working.length)
    return {
      what: 'Light',
      hint: `${dark} miners are working in the dark at reduced speed. Light their faces.`,
    };
  const idle = s.miners.length - working.length - stalled;
  if (idle * 2 >= s.miners.length)
    return {
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

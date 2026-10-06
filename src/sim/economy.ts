// Costs, purchases, the forge and haulage. canon §4.1, §4.9, §9.
import { COST_GROWTH, FORGE, HAULS, MINER_BASE, SMELT, TORCH_CRAFT } from '../data/economy';
import type { Cost } from '../data/items';
import { PICKS } from '../data/items';
import { HAULED, type ResKey } from '../data/resources';
import { UPGRADE_FX } from '../data/upgrades';
import { SHAFT_X } from '../data/constants';
import { D, Decimal } from './decimal';
import type { Game } from './game';
import type { GameState } from './state';

export function scaled(c: Cost, owned: number, mult = 1): Decimal {
  return D(c.n).mul(D(COST_GROWTH).pow(owned)).mul(mult).ceil();
}

export function minerCost(s: GameState): Cost & { amount: Decimal } {
  const mult = s.upgrades.cheapBunks ? UPGRADE_FX.cheapBunks : 1;
  return { ...MINER_BASE, amount: scaled(MINER_BASE, s.miners.length, mult) };
}

export function canPay(s: GameState, costs: readonly { res: ResKey; amount: Decimal }[]): boolean {
  return costs.every((c) => s.res[c.res].gte(c.amount));
}

export function pay(s: GameState, costs: readonly { res: ResKey; amount: Decimal }[]): boolean {
  if (!canPay(s, costs)) return false;
  for (const c of costs) s.res[c.res] = s.res[c.res].sub(c.amount);
  return true;
}

export const flat = (cs: readonly Cost[]): { res: ResKey; amount: Decimal }[] =>
  cs.map((c) => ({ res: c.res, amount: D(c.n) }));

export function nextPick(s: GameState): { res: ResKey; amount: Decimal }[] | null {
  const p = PICKS[s.pickTier + 1];
  return p ? flat(p.cost) : null;
}

export function nextHaul(s: GameState): { res: ResKey; amount: Decimal }[] | null {
  const h = HAULS[s.haulTier + 1];
  return h ? flat(h.cost) : null;
}

export const torchCost = (): { res: ResKey; amount: Decimal }[] => [
  { res: TORCH_CRAFT.cost.res, amount: D(TORCH_CRAFT.cost.n) },
];

function add(s: GameState, k: ResKey, n: Decimal | number): void {
  s.res[k] = s.res[k].add(n);
}

/** canon §9: 5 ore → 1 bar every 2 s; bronze from 2 copper + 1 tin bars. 'auto' alternates whatever ore is waiting. */
export function stepForge(g: Game, dt: number): void {
  const s = g.state;
  if (s.buildings.forge <= 0) return;
  const job = pickJob(s);
  if (!job) {
    s.forge.progress = 0;
    return;
  }
  s.forge.progress += dt;
  if (s.forge.progress < FORGE.seconds) return;
  s.forge.progress = 0;
  if (job === 'bronze') {
    s.res.copperBar = s.res.copperBar.sub(FORGE.bronze.copperBar);
    s.res.tinBar = s.res.tinBar.sub(FORGE.bronze.tinBar);
    add(s, 'bronzeBar', 1);
    g.events.push({ kind: 'smelt', bar: 'bronzeBar' });
  } else {
    const r = SMELT[job]!;
    s.res[r.ore] = s.res[r.ore].sub(FORGE.orePerBar);
    add(s, r.bar, 1);
    g.events.push({ kind: 'smelt', bar: r.bar });
  }
  s.forge.next++;
}

function pickJob(s: GameState): 'bronze' | 'copper' | 'tin' | 'iron' | 'silver' | 'gold' | null {
  const has = (k: ResKey, n: number): boolean => s.res[k].gte(n);
  if (s.forge.recipe === 'bronze')
    return has('copperBar', FORGE.bronze.copperBar) && has('tinBar', FORGE.bronze.tinBar) ? 'bronze' : null;
  if (s.forge.recipe !== 'auto') {
    const r = SMELT[s.forge.recipe]!;
    return has(r.ore, FORGE.orePerBar) ? (s.forge.recipe as 'copper') : null;
  }
  const order = ['copper', 'tin', 'iron', 'silver', 'gold'] as const;
  for (let k = 0; k < order.length; k++) {
    const o = order[(s.forge.next + k) % order.length]!;
    if (has(SMELT[o]!.ore, FORGE.orePerBar)) return o;
  }
  return null;
}

/** Shaft depth in tiles, measured down the main shaft column from the grass line. */
export function shaftDepth(g: Game): number {
  const w = g.world;
  let y = w.surf[SHAFT_X]!;
  while (y < w.h - 1 && w.isAir(SHAFT_X, y + 1)) y++;
  return Math.max(1, y - w.surf[SHAFT_X]!);
}

/** canon §4.9: ore_per_s_max = speed × capacity / shaftDepth. */
export function haulRate(g: Game): number {
  const h = HAULS[g.state.haulTier] ?? HAULS[0]!;
  return (h.speed * h.capacity) / shaftDepth(g);
}

export function stepHaul(g: Game, dt: number): void {
  const s = g.state;
  let budget = haulRate(g) * dt + s.haulAcc;
  for (const k of HAULED) {
    if (budget < 1) break;
    const have = s.underground[k];
    if (have.lte(0)) continue;
    const n = Decimal.min(have, Math.floor(budget));
    s.underground[k] = have.sub(n);
    add(s, k, n);
    budget -= n.toNumber();
  }
  // carry over only a fraction so an empty shaft does not bank capacity
  const waiting = HAULED.some((k) => s.underground[k].gt(0));
  s.haulAcc = waiting ? Math.min(budget, 1) : 0;
}

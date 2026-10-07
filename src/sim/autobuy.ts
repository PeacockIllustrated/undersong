// M13-06 Keep buying: repeatable buys the player has switched to Auto. Pure. canon §23
import { AUTO_BUY } from '../data/economy';
import { METALWORK, type MetalworkId } from '../data/economy';
import { MEALS, WOOD_BUYS, type MealId, type WoodBuyId } from '../data/surface';
import { bulkAction, bulkCost, type BulkKind } from './bulk';
import type { Game } from './game';
import type { GameState } from './state';
import { apply } from './actions';

/** The key a buy is saved under in `auto.buy`. */
export function autoKey(b: BulkKind): string {
  return b.k === 'metal' || b.k === 'meal' || b.k === 'wood' ? `${b.k}:${b.id}` : b.k;
}

/** The buy a saved key stands for, or null for a key this version doesn't know. */
export function fromKey(key: string): BulkKind | null {
  const [k, id] = key.split(':');
  if (k === 'miner' || k === 'whetstone' || k === 'plot' || k === 'sapling') return { k };
  if (k === 'metal' && METALWORK.some((m) => m.id === id)) return { k, id: id as MetalworkId };
  if (k === 'meal' && MEALS.some((m) => m.id === id)) return { k, id: id as MealId };
  if (k === 'wood' && WOOD_BUYS.some((w) => w.id === id)) return { k, id: id as WoodBuyId };
  return null;
}

export const autoBuyOffered = (s: GameState): boolean => s.stats.caveIns >= AUTO_BUY.fromCaveIns;

export const isAuto = (s: GameState, b: BulkKind): boolean => s.auto.buy.includes(autoKey(b));

/** Switch a buy to Auto or back. */
export function setAutoBuy(s: GameState, key: string, on: boolean): void {
  if (!autoBuyOffered(s) || !fromKey(key)) return;
  const has = s.auto.buy.includes(key);
  if (on && !has) s.auto.buy.push(key);
  else if (!on && has) s.auto.buy = s.auto.buy.filter((k) => k !== key);
}

/** Make each switched-on buy once, if its price is a small enough share of what is in hand. Called once a second. */
export function stepAutoBuy(g: Game): void {
  const s = g.state;
  if (!s.auto.buy.length || !autoBuyOffered(s)) return;
  for (const key of s.auto.buy) {
    const b = fromKey(key);
    const c = b && bulkCost(s, b, 1);
    if (!c || !c.costs.every((x) => x.amount.lte(s.res[x.res].mul(AUTO_BUY.share)))) continue;
    const from = g.events.length;
    apply(g, bulkAction(b));
    // no toast for a buy nobody tapped
    for (const e of g.events.slice(from)) if (e.kind === 'bought') e.auto = true;
  }
}

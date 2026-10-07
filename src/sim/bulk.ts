// M8-03: buying ×10 or as many as you can afford, for the repeatable buys. Pure: costs are worked out on a scratch
// copy of the few counts that set the price, never on the game itself.
import type { MealId, WoodBuyId } from '../data/surface';
import type { ResKey } from '../data/resources';
import type { Decimal } from './decimal';
import type { Action } from './actions';
import { minerCost, whetstoneCost } from './economy';
import { mealCost, plotCost, saplingCost, woodCost } from './surface';
import type { GameState } from './state';

export type BulkKind =
  | { k: 'miner' }
  | { k: 'whetstone' }
  | { k: 'plot' }
  | { k: 'sapling' }
  | { k: 'meal'; id: MealId }
  | { k: 'wood'; id: WoodBuyId };

export type Costs = { res: ResKey; amount: Decimal }[];

/** The cost of the next one, on a state whose counts may be scratch copies. */
function next(s: GameState, b: BulkKind): Costs | null {
  switch (b.k) {
    case 'miner': {
      const c = minerCost(s);
      return [{ res: c.res, amount: c.amount }];
    }
    case 'whetstone':
      return whetstoneCost(s);
    case 'plot':
      return plotCost(s);
    case 'sapling':
      return saplingCost(s);
    case 'meal':
      return mealCost(s, b.id);
    case 'wood':
      return woodCost(s, b.id);
  }
}

/** Count one more bought on the scratch copy. */
function grow(t: GameState, b: BulkKind): void {
  if (b.k === 'miner') t.miners.push(t.miners[0]!);
  else if (b.k === 'whetstone') t.whetstone++;
  else if (b.k === 'plot') t.surface.plots.push({ t: 0, golden: false });
  else if (b.k === 'sapling') t.surface.trees.push(t.surface.trees[0]!);
  else if (b.k === 'meal') t.surface.meals[b.id]++;
  else t.surface.wood[b.id]++;
}

function scratch(s: GameState): GameState {
  return {
    ...s,
    miners: [...s.miners],
    surface: {
      ...s.surface,
      plots: [...s.surface.plots],
      trees: [...s.surface.trees],
      meals: { ...s.surface.meals },
      wood: { ...s.surface.wood },
    },
  };
}

/**
 * How many of `b` to buy and what they cost together. `want` is a count, or 'max' for as many as can be paid for
 * now (at least 1 is always priced, so a button can show what the next one costs even when it can't be paid).
 * `n` is how many the total covers; it is less than `want` when the item runs out (a cap) first.
 */
export function bulkCost(
  s: GameState,
  b: BulkKind,
  want: number | 'max',
): { n: number; costs: Costs } | null {
  const t = scratch(s);
  const total = new Map<ResKey, Decimal>();
  const limit = want === 'max' ? 1000 : want;
  let n = 0;
  while (n < limit) {
    const c = next(t, b);
    if (!c) break;
    if (want === 'max' && n > 0) {
      const ok = c.every((x) => s.res[x.res].gte((total.get(x.res) ?? x.amount.mul(0)).add(x.amount)));
      if (!ok) break;
    }
    for (const x of c) total.set(x.res, (total.get(x.res) ?? x.amount.mul(0)).add(x.amount));
    n++;
    grow(t, b);
  }
  if (!n) return null;
  return { n, costs: [...total].map(([res, amount]) => ({ res, amount })) };
}

/** The single action that buys one of `b`. */
export function bulkAction(b: BulkKind): Action {
  switch (b.k) {
    case 'miner':
      return { type: 'hireMiner' };
    case 'whetstone':
      return { type: 'whetstone' };
    case 'plot':
      return { type: 'buyPlot' };
    case 'sapling':
      return { type: 'plantSapling' };
    case 'meal':
      return { type: 'eatMeal', id: b.id };
    case 'wood':
      return { type: 'buyWood', id: b.id };
  }
}

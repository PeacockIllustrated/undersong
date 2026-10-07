// M13-04: one pinned goal, shown on the HUD with how much of its price is in hand. Kept apart from the save.
import { HAULS } from '../data/economy';
import { PICKS } from '../data/items';
import type { BuildingId } from '../data/economy';
import type { HelperId } from '../data/helpers';
import { deepPickCost } from '../sim/beyond';
import { bulkCost } from '../sim/bulk';
import { fromKey } from '../sim/autobuy';
import { nextHaul, nextPick } from '../sim/economy';
import { helperCost, helperOffered } from '../sim/helpers';
import { buildingCost, buildingOffered } from '../sim/village';
import type { Decimal } from '../sim/decimal';
import type { ResKey } from '../data/resources';
import type { GameState } from '../sim/state';

export interface Pin {
  /** What it is and, for one-off buys, which one (so buying it clears the pin): see `pinCost`. */
  id: string;
  name: string;
}

export const PIN_KEY = 'undersong.pin';

let cur: Pin | null = load();
const subs = new Set<() => void>();

function load(): Pin | null {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(PIN_KEY);
    const p = raw ? (JSON.parse(raw) as Partial<Pin>) : null;
    return p && typeof p.id === 'string' && typeof p.name === 'string' ? { id: p.id, name: p.name } : null;
  } catch {
    return null;
  }
}

export function pinned(): Pin | null {
  return cur;
}

export function setPin(p: Pin | null): void {
  cur = p;
  try {
    if (p) localStorage.setItem(PIN_KEY, JSON.stringify(p));
    else localStorage.removeItem(PIN_KEY);
  } catch {
    // storage refused: the pin lasts for this visit
  }
  for (const f of subs) f();
}

export function onPin(f: () => void): () => void {
  subs.add(f);
  return () => void subs.delete(f);
}

type Costs = { res: ResKey; amount: Decimal }[];

/**
 * The pinned thing's price now, or null once it is bought or no longer offered.
 * Ids: `pick:<tier>`, `haul:<tier>`, `deep:<n>` and `h:<helper>:<level>` are one-off buys; `b:<building>` and
 * `k:<auto key>` (miners, sharpening, metalwork, plots, saplings, meals, woodlot buys) stay pinned as they repeat.
 */
export function pinCost(s: GameState, id: string): Costs | null {
  const [k, a, b] = id.split(':');
  switch (k) {
    case 'pick':
      return s.pickTier + 1 === Number(a) && PICKS[Number(a)] ? nextPick(s) : null;
    case 'haul':
      return s.haulTier + 1 === Number(a) && HAULS[Number(a)] ? nextHaul(s) : null;
    case 'deep':
      return s.deepPick + 1 === Number(a) ? deepPickCost(s) : null;
    case 'b':
      return buildingOffered(s, a as BuildingId) ? buildingCost(s, a as BuildingId) : null;
    case 'h':
      return helperOffered(s, a as HelperId) && (s.helpers[a as HelperId] ?? 0) === Number(b)
        ? helperCost(s, a as HelperId)
        : null;
    case 'k': {
      const kind = fromKey(id.slice(2));
      return kind ? (bulkCost(s, kind, 1)?.costs ?? null) : null;
    }
    default:
      return null;
  }
}

/** How much of the price is in hand, 0 to 1: the part you are furthest from decides. */
export function pinShare(s: GameState, costs: Costs): number {
  let f = 1;
  for (const c of costs) {
    if (c.amount.lte(0)) continue;
    f = Math.min(f, Math.min(1, s.res[c.res].div(c.amount).toNumber()));
  }
  return Number.isFinite(f) ? Math.max(0, f) : 0;
}

/** Which Village tab and card a pin belongs to, for tapping the HUD chip. */
export function pinPlace(id: string): { tab: 'build' | 'fields' | 'wood' | 'hands' | 'loom'; card: string } {
  const [k, a] = id.split(':');
  if (k === 'pick' || k === 'deep') return { tab: 'build', card: 'pick' };
  if (k === 'haul') return { tab: 'build', card: 'haul' };
  if (k === 'h') return { tab: 'hands', card: `helper:${a}` };
  if (k === 'b') return { tab: a === 'songloom' ? 'loom' : 'build', card: a! };
  // k:<auto key>
  if (a === 'miner') return { tab: 'build', card: 'miner' };
  if (a === 'whetstone' || a === 'metal') return { tab: 'build', card: 'pick' };
  if (a === 'plot') return { tab: 'fields', card: 'plot' };
  if (a === 'meal') return { tab: 'fields', card: 'meal' };
  if (a === 'sapling') return { tab: 'wood', card: 'sapling' };
  return { tab: 'wood', card: `wood:${id.split(':')[2]}` };
}

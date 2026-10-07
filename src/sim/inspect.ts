// M7-03: what a tile is, for the hover label. Pure: reads the game, never writes it.
import { MATERIALS, MIN_PICK, canDig, isMineable } from '../data/materials';
import { PICKS } from '../data/items';
import type { ResKey } from '../data/resources';
import type { Game } from './game';
import { foremanRate } from './dig';
import { hardnessAt } from './formulas';

export interface TileInfo {
  name: string;
  /** Seconds for the Foreman to break it where it is, as things stand now. */
  secs?: number;
  drop?: ResKey;
  /** The pick it wants, when the village's is not good enough. */
  needs?: string;
}

export function inspect(g: Game, x: number, y: number): TileInfo | null {
  const m = g.world.get(x, y);
  const def = MATERIALS[m];
  if (!def || !isMineable(m)) return null;
  const drop = def.drop?.res;
  if (!canDig(m, g.state.pickTier)) return { name: def.name, drop, needs: PICKS[MIN_PICK[m]!]!.name };
  const rate = foremanRate(g, { x, y });
  const need = hardnessAt(g.world.hardnessOf(x, y), g.world.depth(y));
  return { name: def.name, drop, secs: rate > 0 ? need / rate : undefined };
}

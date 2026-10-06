// Everything the player can ask for. The UI dispatches these; only the sim applies them. dev-bible §1.2
import { DIG_QUEUE_MAX } from '../data/constants';
import { isMineable } from '../data/materials';
import type { Game } from './game';
import type { Tile } from './state';

export type Action =
  { type: 'dig'; x: number; y: number } | { type: 'digPath'; tiles: Tile[] } | { type: 'cancelDig' };

function queued(g: Game, x: number, y: number): boolean {
  const f = g.state.foreman;
  return (f.target?.x === x && f.target.y === y) || f.queue.some((t) => t.x === x && t.y === y);
}

function enqueue(g: Game, x: number, y: number, mustBeExposed: boolean): boolean {
  const { world } = g;
  const f = g.state.foreman;
  if (!isMineable(world.get(x, y))) return false;
  if (queued(g, x, y)) return true;
  if (mustBeExposed && !world.exposed(x, y)) {
    g.events.push({ kind: 'refused', x, y });
    return false;
  }
  if (f.queue.length >= DIG_QUEUE_MAX) return false;
  f.queue.push({ x, y });
  return true;
}

export function apply(g: Game, a: Action): void {
  switch (a.type) {
    case 'dig':
      enqueue(g, a.x, a.y, true);
      return;
    case 'digPath': {
      // The first tile must be workable now; the rest open up as the path is dug.
      let first = true;
      for (const t of a.tiles) {
        if (!enqueue(g, t.x, t.y, first)) {
          if (first) return;
          continue;
        }
        first = false;
      }
      return;
    }
    case 'cancelDig':
      g.state.foreman.queue = [];
      g.state.foreman.target = null;
      g.state.foreman.work = 0;
      return;
  }
}

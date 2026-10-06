// The Song-loom: weave known verses into charms and slot them. canon §13
import { CHARM, CHARMS, type CharmId } from '../data/charms';
import type { ResKey } from '../data/resources';
import type { Decimal } from './decimal';
import { flat, pay } from './economy';
import { syncWorld, type Game } from './game';
import type { GameState } from './state';
import { first, say } from './story';

export function charmSlots(s: GameState): number {
  return Math.min(CHARM.maxSlots, CHARM.slotsBase + s.buildings.songloom);
}

export function weaveCost(s: GameState): { res: ResKey; amount: Decimal }[] {
  return flat(CHARM.cost(s.charms.owned.length));
}

/** A charm can be woven once its verse is known (in any cycle) and a Song-loom stands. */
export function canWeave(s: GameState, id: CharmId): boolean {
  const c = CHARMS.find((x) => x.id === id);
  return !!c && s.buildings.songloom > 0 && s.verses.known[c.verse] === true && !s.charms.owned.includes(id);
}

export function weave(g: Game, id: CharmId): boolean {
  const s = g.state;
  if (!canWeave(s, id) || !pay(s, weaveCost(s))) return false;
  s.charms.owned.push(id);
  first(g, 'charm');
  say(g, 'firstCharm');
  g.events.push({ kind: 'bought', what: 'charm' });
  // a fresh charm goes straight into a free slot
  if (s.charms.equipped.length < charmSlots(s)) equip(g, id);
  return true;
}

/** Slot a woven charm, or take it out if it is already slotted. */
export function equip(g: Game, id: CharmId): void {
  const s = g.state;
  if (!s.charms.owned.includes(id)) return;
  const eq = s.charms.equipped;
  if (eq.includes(id)) s.charms.equipped = eq.filter((x) => x !== id);
  else if (eq.length < charmSlots(s)) eq.push(id);
  else return;
  syncWorld(s, g.world);
}

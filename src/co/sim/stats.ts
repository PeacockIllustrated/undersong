// Derived numbers: what the contract's upgrades, relics and the Survey Book add up to. Pure.
import { PICKS } from '../../data/items';
import { D, type Decimal } from '../../sim/decimal';
import {
  BOOK,
  BOOK_FX,
  CREW,
  DAY,
  ECHO_POWER,
  KIT,
  PICK_COSTS,
  QUOTA,
  SHAFT,
  SHOP,
  UPGRADE,
  VERSE_POWER,
  BODY,
  type BookId,
  type ShopId,
} from '../data/co';
import type { CoState } from './state';

const has = (s: CoState, r: string): boolean => s.contract.relics.includes(r as never);
const lvl = (s: CoState, id: ShopId): number => s.contract.levels[id];
const book = (s: CoState, id: BookId): number => s.meta.book[id];

export function pickTier(s: CoState): number {
  return Math.min(PICKS.length - 1, lvl(s, 'pick'));
}

export function pickPower(s: CoState): number {
  return PICKS[pickTier(s)]!.power;
}

/** Everyone digs faster for every Echo ever earned. */
export const echoMult = (s: CoState): number => 1 + ECHO_POWER * s.meta.echoesEver.toNumber();

export function handMult(s: CoState): number {
  return (
    (1 + UPGRADE.whetstone * lvl(s, 'whetstone')) *
    (1 + BOOK_FX.steady * book(s, 'steady')) *
    (has(s, 'ring') ? 1.3 : 1) *
    echoMult(s)
  );
}

export function runMult(s: CoState): number {
  return (1 + UPGRADE.boots * lvl(s, 'boots')) * (has(s, 'boots') ? 1.15 : 1);
}

export function packCap(s: CoState): number {
  return Math.floor(
    KIT.pack *
      (1 + UPGRADE.pack * lvl(s, 'pack')) *
      (1 + BOOK_FX.pockets * book(s, 'pockets')) *
      (has(s, 'collar') ? 1.3 : 1),
  );
}

export function dayLength(s: CoState): number {
  return (
    DAY.baseS +
    DAY.hourS * lvl(s, 'hours') +
    BOOK_FX.longLight * book(s, 'longLight') +
    (has(s, 'flask') ? 15 : 0)
  );
}

export const shaftDepth = (s: CoState): number => SHAFT.baseDepth + SHAFT.depthStep * lvl(s, 'shaft');
export const ladders = (s: CoState): number => KIT.ladders + UPGRADE.ladders * lvl(s, 'ladders');
export const charges = (s: CoState): number => KIT.charges + UPGRADE.charges * lvl(s, 'charges');
export const blastRadius = (s: CoState): number => KIT.blastRadius + lvl(s, 'blast');
export const jetFuel = (s: CoState): number => BODY.jetFuelS * lvl(s, 'jetpack');
export const hands = (s: CoState): number => lvl(s, 'hand');
export const deputies = (s: CoState): number => lvl(s, 'deputy');

export function scripMult(s: CoState): number {
  return 1 + BOOK_FX.strike * book(s, 'strike');
}
export const oreMult = (s: CoState): number => scripMult(s) * (has(s, 'lamp') ? 1.25 : 1);
export const chestMult = (s: CoState): number => scripMult(s) * (has(s, 'button') ? 2 : 1);

/** Coal a second from the whole crew. hybrid canon §8 */
export function crewRate(s: CoState): number {
  const n = hands(s);
  if (n <= 0) return 0;
  const per = CREW.rate * Math.sqrt(pickPower(s));
  const led = Math.min(deputies(s) * CREW.deputyGang, n);
  const verse = 1 + VERSE_POWER * s.meta.verses.length;
  const union = 1 + BOOK_FX.union * book(s, 'union');
  return (n + led * CREW.deputyBoost) * per * verse * union * echoMult(s);
}

export const isAudit = (day: number): boolean => day % QUOTA.auditEvery === 0;

/** hybrid canon §3. */
export function quota(s: CoState, day: number): Decimal {
  let q = D(QUOTA.growth)
    .pow(day - 1)
    .mul(QUOTA.base);
  if (isAudit(day)) q = q.mul(QUOTA.audit);
  if (day <= QUOTA.softDays) q = q.mul(QUOTA.soft);
  if (has(s, 'pen')) q = q.mul(0.9);
  return q.ceil();
}

/** Price of the next level of a Company Store item, or null when it is maxed. */
export function shopCost(s: CoState, id: ShopId): Decimal | null {
  const def = SHOP.find((d) => d.id === id)!;
  const l = lvl(s, id);
  if (def.max !== undefined && l >= def.max) return null;
  if (id === 'pick') {
    const c = PICK_COSTS[l + 1];
    return c === undefined ? null : D(c);
  }
  return D(def.growth).pow(l).mul(def.base).floor();
}

export function bookCost(s: CoState, id: BookId): Decimal | null {
  const def = BOOK.find((d) => d.id === id)!;
  const l = book(s, id);
  if (def.max !== undefined && l >= def.max) return null;
  return D(def.growth).pow(l).mul(def.base).floor();
}

export const pardons = (s: CoState): number => book(s, 'pardon');

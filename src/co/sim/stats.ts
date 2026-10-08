// Derived numbers: what the contract's upgrades, relics and the Survey Book add up to. Pure.
import { D, type Decimal } from '../../sim/decimal';
import {
  BOOK,
  BOOK_FX,
  CREW,
  DAY,
  ECHO_POWER,
  ENDLESS,
  RULE_FX,
  KIT,
  CO_PICKS,
  QUOTA,
  ROLE_FX,
  ROLE_IDS,
  SEAM_FX,
  SHAFT,
  SHOP,
  UPGRADE,
  VERSE_POWER,
  BODY,
  FOREMAN_FX,
  UNION,
  type BookId,
  type ForemanId,
  type OreId,
  type RuleId,
  type ShopId,
} from '../data/co';
import type { CoState } from './state';

const has = (s: CoState, r: string): boolean => s.contract.relics.includes(r as never);
const lvl = (s: CoState, id: ShopId): number => s.contract.levels[id];
const book = (s: CoState, id: BookId): number => s.meta.book[id];
/** Is this Foreman leading the contract? */
export const led = (s: CoState, id: ForemanId): boolean => s.contract.foreman === id;

/** Index into CO_PICKS: the pick the Foreman carries. */
export const pickIndex = (s: CoState): number => Math.min(CO_PICKS.length - 1, lvl(s, 'pick'));

/** The Undersong tier the pick digs as (MIN_PICK gates). */
export function pickTier(s: CoState): number {
  return CO_PICKS[pickIndex(s)]!.gate;
}

export function pickPower(s: CoState): number {
  return CO_PICKS[pickIndex(s)]!.power;
}

/** Everyone digs faster for every Echo ever earned. */
export const echoMult = (s: CoState): number => 1 + ECHO_POWER * s.meta.echoesEver.toNumber();

export function handMult(s: CoState): number {
  // the Lone Foreman counts every bonus to digging by hand five times
  const k = led(s, 'lone') ? FOREMAN_FX.loneHand : 1;
  return (
    (1 + UPGRADE.whetstone * lvl(s, 'whetstone') * k) *
    (1 + BOOK_FX.steady * book(s, 'steady') * k) *
    (has(s, 'ring') ? 1 + 0.3 * k : 1) *
    (1 + (echoMult(s) - 1) * k)
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
      (has(s, 'collar') ? 1.3 : 1) *
      (led(s, 'fieldhand') ? FOREMAN_FX.fieldPack : 1),
  );
}

export function dayLength(s: CoState): number {
  const t =
    DAY.baseS +
    DAY.hourS * lvl(s, 'hours') +
    BOOK_FX.longLight * book(s, 'longLight') +
    (has(s, 'flask') ? 15 : 0);
  const r = ruled(s, 'shortShifts') ? RULE_FX.day : 1;
  return Math.round(t * r * (s.contract.seam === 'chimney' ? SEAM_FX.chimney.dayMult : 1));
}

/** How deep the shaft goes: the village's ladder, sunk further on the Hanging Geode and the Hollow Heart. */
export function shaftDepth(s: CoState): number {
  const d = SHAFT.baseDepth + SHAFT.depthStep * lvl(s, 'shaft');
  if (s.contract.seam === 'geode') return Math.max(d, SEAM_FX.geode.top + 1);
  if (s.contract.seam === 'heart') return Math.max(d, SEAM_FX.heart.shaftDepth);
  return d;
}

/** Seam rules: the Chimney's short days and double pay. */
const chimney = (s: CoState): boolean => s.contract.seam === 'chimney';
const props = (s: CoState): number => (led(s, 'woodcutter') ? FOREMAN_FX.woodProps : 1);
export const ladders = (s: CoState): number => (KIT.ladders + UPGRADE.ladders * lvl(s, 'ladders')) * props(s);
export const platforms = (s: CoState): number =>
  (KIT.platforms + UPGRADE.platforms * lvl(s, 'ladders')) * props(s);
export const charges = (s: CoState): number =>
  KIT.charges + UPGRADE.charges * lvl(s, 'charges') + (led(s, 'smith') ? FOREMAN_FX.smithCharges : 0);
export const blastRadius = (s: CoState): number => KIT.blastRadius + lvl(s, 'blast');
export const jetFuel = (s: CoState): number => BODY.jetFuelS * lvl(s, 'jetpack');
export const hands = (s: CoState): number => lvl(s, 'hand');
export const deputies = (s: CoState): number => lvl(s, 'deputy');
export const role = (s: CoState, id: (typeof ROLE_IDS)[number]): number => lvl(s, id);
/** Hands promoted into a role. Promotions never outnumber hands (canon §8.1). */
export const promoted = (s: CoState): number => ROLE_IDS.reduce((a, k) => a + lvl(s, k), 0);
/** Hands still at the face: everyone but putters, shotfirers, lampmen and pumpmen (deputies lead and dig). */
export const hewers = (s: CoState): number => Math.max(0, hands(s) - promoted(s) + deputies(s));
/** The lampmen who count: at most one per ROLE_FX.lampPer hands. */
export const lampmen = (s: CoState): number =>
  Math.min(role(s, 'lampman'), Math.floor(hands(s) / ROLE_FX.lampPer));

export function scripMult(s: CoState): number {
  return (1 + BOOK_FX.strike * book(s, 'strike')) * (chimney(s) ? SEAM_FX.chimney.scrip : 1);
}
export const oreMult = (s: CoState): number => scripMult(s) * (has(s, 'lamp') ? 1.25 : 1);
export const chestMult = (s: CoState): number => scripMult(s) * (has(s, 'button') ? 2 : 1);

/** Coal a second from the whole crew. hybrid canon §8 */
/** Is a Company Rule signed into this contract? (H8) */
export const ruled = (s: CoState, id: RuleId): boolean => s.contract.rules.includes(id);

export function crewRate(s: CoState): number {
  const n = hewers(s);
  if (n <= 0) return 0;
  const per = CREW.rate * Math.sqrt(pickPower(s));
  const gang = Math.min(deputies(s) * CREW.deputyGang, n);
  const verse = 1 + VERSE_POWER * s.meta.verses.length;
  const union = 1 + BOOK_FX.union * book(s, 'union');
  const lit = (1 + ROLE_FX.lampman * lampmen(s)) * (led(s, 'lamplighter') ? FOREMAN_FX.lampCrew : 1);
  const dark = ruled(s, 'deadLamps') ? RULE_FX.crew : 1;
  return (n + gang * CREW.deputyBoost) * per * verse * union * lit * dark * echoMult(s);
}

export const isAudit = (day: number): boolean => day % QUOTA.auditEvery === 0;

/** hybrid canon §3. */
export function quota(s: CoState, day: number): Decimal {
  let q = D(QUOTA.growth)
    .pow(day - 1)
    .mul(QUOTA.base);
  if (isAudit(day)) q = q.mul(QUOTA.audit);
  if (day <= QUOTA.softDays && !ruled(s, 'noMercy')) q = q.mul(QUOTA.soft);
  if (ruled(s, 'tightLedger')) q = q.mul(RULE_FX.quota);
  if (has(s, 'pen')) q = q.mul(0.9);
  // the Endless Contract: the quota climbs faster every day after it was signed
  if (s.contract.endless > 0 && day > s.contract.endless)
    q = q.mul(D(ENDLESS.growth).pow(day - s.contract.endless));
  return q.ceil();
}

/** Price of the next level of a Company Store item, or null when it is maxed. */
export function shopCost(s: CoState, id: ShopId): Decimal | null {
  const def = SHOP.find((d) => d.id === id)!;
  const l = lvl(s, id);
  if (def.max !== undefined && l >= def.max) return null;
  if (id === 'pick') {
    const c = CO_PICKS[l + 1];
    return c === undefined ? null : D(c.scrip);
  }
  let k = 1;
  if (id === 'hand' && led(s, 'fieldhand')) k *= FOREMAN_FX.fieldHire;
  if (id === 'hours' && led(s, 'lamplighter')) k = 0;
  if ((ROLE_IDS as readonly string[]).includes(id))
    k *= Math.max(0, 1 - UNION.closedShop * book(s, 'closedShop'));
  return D(def.growth).pow(l).mul(def.base).mul(k).floor();
}

/** The ore the next level of a store item also needs (ADR-H009). Empty when it needs none or is maxed. */
export function shopOres(s: CoState, id: ShopId): { id: OreId; n: number }[] {
  const def = SHOP.find((d) => d.id === id)!;
  const l = lvl(s, id);
  if (def.max !== undefined && l >= def.max) return [];
  const k = led(s, 'smith') ? FOREMAN_FX.smithOre : 1;
  const cut = (o: { id: OreId; n: number }): { id: OreId; n: number } => ({
    id: o.id,
    n: Math.ceil(o.n * k),
  });
  if (id === 'pick') return (CO_PICKS[l + 1]?.ores ?? []).map(cut);
  if (!def.ore) return [];
  return [cut({ id: def.ore.id, n: Math.floor(def.ore.base * Math.pow(def.ore.growth, l)) })];
}

export const hasOres = (s: CoState, need: readonly { id: OreId; n: number }[]): boolean =>
  need.every((o) => s.contract.ores[o.id] >= o.n);

export function bookCost(s: CoState, id: BookId): Decimal | null {
  const def = BOOK.find((d) => d.id === id)!;
  const l = book(s, id);
  if (def.max !== undefined && l >= def.max) return null;
  return D(def.growth).pow(l).mul(def.base).floor();
}

export const pardons = (s: CoState): number => (ruled(s, 'noMercy') ? 0 : book(s, 'pardon'));

// Nights, contracts and the Cave-in: the tally at dusk, the Company Store, Echoes and the Survey Book. Pure.
import { D, Decimal, ZERO } from '../../sim/decimal';
import { makeRng } from '../../sim/rng';
import {
  AWAY,
  BOOK_FX,
  DAY,
  ECHO,
  GRADES,
  HEART_ECHOES,
  RELICS,
  ROLE_IDS,
  SHOP,
  STREAK,
  TINKER,
  type BookId,
  type RelicId,
  type ShopId,
} from '../data/co';
import { startDay } from './day';
import { newContract, type Game } from './state';
import {
  bookCost,
  crewRate,
  dayLength,
  hands,
  hasOres,
  pardons,
  promoted,
  scripMult,
  shopCost,
  shopOres,
} from './stats';

/** After the tally has been read at dusk: on to the night, or the roof comes down. */
export function settleDusk(g: Game): void {
  const s = g.s;
  const d = g.day;
  if (s.phase !== 'dusk' || !d) return;
  const c = s.contract;
  const passed = d.deposited.gte(d.quota);
  const pardoned = !passed && c.pardonsUsed < pardons(s);
  if (pardoned) c.pardonsUsed++;
  c.streak = passed ? c.streak + 1 : 0;
  const mult = streakMult(c.streak);
  const surplus = passed ? d.deposited.sub(d.quota).mul(scripMult(s)).mul(mult).floor() : ZERO();
  const g8 = passed ? gradeOf(d.deposited.div(d.quota).toNumber()) : null;
  const gradeScrip = g8 ? d.quota.mul(g8.bonus).mul(scripMult(s)).mul(mult).floor() : ZERO();
  c.scrip = c.scrip.add(surplus).add(gradeScrip);
  s.tally = {
    day: c.day,
    quota: d.quota,
    deposited: d.deposited,
    byHand: d.byHand,
    byCrew: d.byCrew,
    byHaul: d.byHaul,
    late: d.late,
    oreScrip: d.oreScrip,
    chestScrip: d.chestScrip,
    surplusScrip: surplus,
    ores: { ...d.ores },
    grade: g8?.name ?? null,
    gradeScrip,
    streak: c.streak,
    passed,
    pardoned,
  };
  g.day = null;
  g.world = null;
  if (passed || pardoned) {
    if (passed) c.survived++;
    s.meta.bestDay = Math.max(s.meta.bestDay, c.day);
    s.phase = 'night';
    c.tinker = { offers: rollOffers(g), rerolls: 0 };
  } else caveIn(g);
}

/** hybrid canon §14: the streak multiplier on surplus and grade scrip. */
export const streakMult = (streak: number): number =>
  Math.min(STREAK.max, 1 + STREAK.step * Math.max(0, streak - 1));

/** The best grade a shift earned, by deposited ÷ quota. */
export function gradeOf(ratio: number): (typeof GRADES)[number] | null {
  return GRADES.find((x) => ratio >= x.at) ?? null;
}

/** Three relics the contract does not hold yet, from the state's rng. */
function rollOffers(g: Game): RelicId[] {
  const left = (Object.keys(RELICS) as RelicId[]).filter((r) => !g.s.contract.relics.includes(r));
  const rng = makeRng(g.s.rng);
  const out: RelicId[] = [];
  while (out.length < TINKER.offers && left.length) out.push(left.splice(rng.int(0, left.length - 1), 1)[0]!);
  g.s.rng = rng.state();
  return out;
}

export const relicCost = (g: Game): Decimal =>
  D(TINKER.growth).pow(g.s.contract.relics.length).mul(TINKER.base).floor();
export const rerollCost = (g: Game): Decimal =>
  D(TINKER.rerollGrowth).pow(g.s.contract.tinker.rerolls).mul(TINKER.reroll).floor();

/** Buy one of tonight's relic offers from the tinker. */
export function buyRelic(g: Game, id: RelicId): boolean {
  const c = g.s.contract;
  if (g.s.phase !== 'night' || !c.tinker.offers.includes(id) || c.relics.includes(id)) return false;
  const cost = relicCost(g);
  if (c.scrip.lt(cost)) return false;
  c.scrip = c.scrip.sub(cost);
  c.relics.push(id);
  c.tinker.offers = c.tinker.offers.filter((r) => r !== id);
  return true;
}

export function rerollTinker(g: Game): boolean {
  const c = g.s.contract;
  if (g.s.phase !== 'night') return false;
  const cost = rerollCost(g);
  if (c.scrip.lt(cost)) return false;
  c.scrip = c.scrip.sub(cost);
  c.tinker.rerolls++;
  c.tinker.offers = rollOffers(g);
  return true;
}

/** What a Cave-in would pay if the roof came down tonight (plan: "Echoes if it came down tonight"). */
export const echoesIfTonight = (g: Game): Decimal => contractEchoes(g);

/** Echoes for the contract as it stands: the coal formula, plus each heartstone still banked (ADR-H009). */
function contractEchoes(g: Game): Decimal {
  const c = g.s.contract;
  return echoGain(c.coal, c.survived, c.versesFound.length).add(c.ores.heart * HEART_ECHOES);
}

/** Sing it down: end the contract on purpose at night and take the Echoes. */
export function singDown(g: Game): boolean {
  if (g.s.phase !== 'night') return false;
  caveIn(g);
  return true;
}

/** hybrid canon §12. Any contract that sent coal up pays at least ECHO.min, so no Cave-in is wasted. */
export function echoGain(coal: Decimal, days: number, verses: number): Decimal {
  if (coal.lte(0)) return ZERO();
  return Decimal.max(
    D(ECHO.min),
    coal
      .div(ECHO.div)
      .sqrt()
      .mul(1 + ECHO.perDay * days)
      .mul(1 + ECHO.perVerse * verses)
      .floor(),
  );
}

/** The roof comes down: the contract is over, and the village is paid in Echoes. */
export function caveIn(g: Game): void {
  const s = g.s;
  const c = s.contract;
  const echoes = contractEchoes(g);
  s.meta.echoes = s.meta.echoes.add(echoes);
  s.meta.echoesEver = s.meta.echoesEver.add(echoes);
  s.meta.contracts++;
  s.caveIn = { contract: c.n, days: c.survived, coal: c.coal, verses: c.versesFound.length, echoes };
  s.phase = 'cavein';
  g.day = null;
  g.world = null;
}

/** Can the next level of a store item be bought right now: tonight, unlocked, unmaxed, affordable in scrip and ore? */
export function canBuy(g: Game, id: ShopId): boolean {
  const s = g.s;
  if (s.phase !== 'night') return false;
  const def = SHOP.find((x) => x.id === id);
  if (!def || (def.fromDay ?? 0) > s.contract.day + 1) return false;
  // a promotion needs a hand to promote
  if ((ROLE_IDS as readonly string[]).includes(id) && promoted(s) >= hands(s)) return false;
  const cost = shopCost(s, id);
  return !!cost && s.contract.scrip.gte(cost) && hasOres(s, shopOres(s, id));
}

export function buy(g: Game, id: ShopId): boolean {
  if (!canBuy(g, id)) return false;
  const s = g.s;
  s.contract.scrip = s.contract.scrip.sub(shopCost(s, id)!);
  for (const o of shopOres(s, id)) s.contract.ores[o.id] -= o.n;
  s.contract.levels[id]++;
  return true;
}

export function buyBook(g: Game, id: BookId): boolean {
  const s = g.s;
  const cost = bookCost(s, id);
  if (!cost || s.meta.echoes.lt(cost)) return false;
  s.meta.echoes = s.meta.echoes.sub(cost);
  s.meta.book[id]++;
  return true;
}

/** Go down again: the next day of this contract. */
export function nextDay(g: Game): void {
  if (g.s.phase !== 'night') return;
  g.s.contract.day++;
  startDay(g);
}

/** Sign a new contract with the Company and start its first day. */
export function signContract(g: Game, seed: number): void {
  const s = g.s;
  const c = newContract(s.meta.contracts + 1, seed);
  c.levels.hand = BOOK_FX.oldHands * s.meta.book.oldHands;
  const led = s.meta.book.ledger;
  if (led > 0)
    c.scrip = D(BOOK_FX.ledger)
      .mul(D(BOOK_FX.ledgerGrowth).pow(led - 1))
      .floor();
  s.contract = c;
  s.caveIn = null;
  s.tally = null;
  startDay(g);
}

/** Night-shift pay: time away pays a share of the crew's day as scrip. Only at night; never ends a contract. */
export function awayPay(g: Game, awayS: number): Decimal {
  const s = g.s;
  if (s.phase !== 'night' || awayS < AWAY.minS) return ZERO();
  const t = Math.min(awayS, AWAY.capH * 3600);
  const pay = D(crewRate(s) * t * AWAY.share * scripMult(s)).floor();
  s.contract.scrip = s.contract.scrip.add(pay);
  return pay;
}

/** Seconds of daylight left, for the HUD. */
export const daylightLeft = (g: Game): number =>
  g.day ? Math.max(0, g.day.length - g.day.t) : dayLength(g.s);
export const duskDone = (g: Game): boolean => !!g.day && g.s.phase === 'dusk' && g.day.dusk >= DAY.duskS;

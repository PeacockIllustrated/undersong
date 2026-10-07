// Nights, contracts and the Cave-in: the tally at dusk, the Company Store, Echoes and the Survey Book. Pure.
import { D, Decimal, ZERO } from '../../sim/decimal';
import { AWAY, BOOK_FX, DAY, ECHO, SHOP, type BookId, type ShopId } from '../data/co';
import { startDay } from './day';
import { newContract, type Game } from './state';
import { bookCost, crewRate, dayLength, pardons, scripMult, shopCost } from './stats';

/** After the tally has been read at dusk: on to the night, or the roof comes down. */
export function settleDusk(g: Game): void {
  const s = g.s;
  const d = g.day;
  if (s.phase !== 'dusk' || !d) return;
  const c = s.contract;
  const passed = d.deposited.gte(d.quota);
  const pardoned = !passed && c.pardonsUsed < pardons(s);
  if (pardoned) c.pardonsUsed++;
  const surplus = passed ? d.deposited.sub(d.quota).mul(scripMult(s)).floor() : ZERO();
  c.scrip = c.scrip.add(surplus);
  s.tally = {
    day: c.day,
    quota: d.quota,
    deposited: d.deposited,
    byHand: d.byHand,
    byCrew: d.byCrew,
    late: d.late,
    oreScrip: d.oreScrip,
    chestScrip: d.chestScrip,
    surplusScrip: surplus,
    passed,
    pardoned,
  };
  g.day = null;
  g.world = null;
  if (passed || pardoned) {
    if (passed) c.survived++;
    s.meta.bestDay = Math.max(s.meta.bestDay, c.day);
    s.phase = 'night';
  } else caveIn(g);
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
  const echoes = echoGain(c.coal, c.survived, c.versesFound.length);
  s.meta.echoes = s.meta.echoes.add(echoes);
  s.meta.echoesEver = s.meta.echoesEver.add(echoes);
  s.meta.contracts++;
  s.caveIn = { contract: c.n, days: c.survived, coal: c.coal, verses: c.versesFound.length, echoes };
  s.phase = 'cavein';
  g.day = null;
  g.world = null;
}

export function buy(g: Game, id: ShopId): boolean {
  const s = g.s;
  if (s.phase !== 'night') return false;
  const def = SHOP.find((x) => x.id === id);
  if (!def || (def.fromDay ?? 0) > s.contract.day + 1) return false;
  const cost = shopCost(s, id);
  if (!cost || s.contract.scrip.lt(cost)) return false;
  s.contract.scrip = s.contract.scrip.sub(cost);
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

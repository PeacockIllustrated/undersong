// Nights, contracts and the Cave-in: the tally at dusk, the Company Store, Echoes and the Survey Book. Pure.
import { D, Decimal, ZERO } from '../../sim/decimal';
import { makeRng } from '../../sim/rng';
import {
  AWAY,
  BOOK_FX,
  DAY,
  ECHO,
  ENDLESS,
  OVERMAN,
  GRADES,
  HEART_ECHOES,
  RELICS,
  ROLE_IDS,
  SHOP,
  STREAK,
  TINKER,
  BADGE_DAY,
  FOREMEN,
  SEAM_DEFS,
  SEAM_IDS,
  SEAM_UNLOCK_DAY,
  UNION,
  type ForemanId,
  type SeamId,
  type Unlock,
  type BookId,
  type RelicId,
  type ShopId,
} from '../data/co';
import { idleControl } from './body';
import { startDay, stepDay } from './day';
import { newContract, type CaveIn, type Game } from './state';
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
  if (passed) earnBadges(g);
  if (passed || pardoned) {
    if (passed) c.survived++;
    s.meta.bestDay = Math.max(s.meta.bestDay, c.day);
    s.phase = 'night';
    c.tinker = { offers: rollOffers(g), rerolls: 0 };
  } else caveIn(g);
}

/** A day survived on the badge days earns the Foreman's and the Seam's badges. */
function earnBadges(g: Game): void {
  const c = g.s.contract;
  const m = g.s.meta;
  const add = (id: string): void => {
    if (!m.badges.includes(id)) m.badges.push(id);
  };
  if (c.day >= BADGE_DAY) add(`fm:${c.foreman}`);
  if (c.day >= SEAM_UNLOCK_DAY) add(`seam:${c.seam}`);
}

/** Has the village met an unlock condition? */
export function unlocked(g: Game, u: Unlock): boolean {
  const m = g.s.meta;
  switch (u.kind) {
    case 'start':
      return true;
    case 'contracts':
      return m.contracts >= u.n;
    case 'bestDay':
      return m.bestDay >= u.n;
    case 'verses':
      return m.verses.length >= u.n;
    case 'badge':
      return m.badges.includes(u.id);
  }
}

export const foremanOpen = (g: Game, id: ForemanId): boolean => unlocked(g, FOREMEN[id].unlock);

export function seamOpen(g: Game, id: SeamId): boolean {
  const after = SEAM_DEFS[id].after;
  if (after === null) return true;
  if (after === 'all')
    return SEAM_IDS.filter((k) => k !== id).every((k) => g.s.meta.badges.includes(`seam:${k}`));
  return g.s.meta.badges.includes(`seam:${after}`);
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
  // Picket Line: Echoes for every day survived past the best the village had when it signed
  const past = Math.max(0, c.firstDay - 1 + c.survived - c.bestBefore);
  const picket = past * UNION.picket * g.s.meta.book.picket;
  return echoGain(c.coal, c.survived, c.versesFound.length)
    .add(c.ores.heart * HEART_ECHOES)
    .add(picket)
    .mul(1 + ENDLESS.newSongEcho * g.s.meta.newSong)
    .floor();
}

/** The choice at Verse XII: fill the last quota (the Endless Contract) or sing the last verse (New Song+). */
export function chooseEnding(g: Game, which: 'quota' | 'song'): boolean {
  const s = g.s;
  const c = s.contract;
  if (s.phase !== 'night' || !c.choice) return false;
  c.choice = false;
  if (!s.meta.endings.includes(which)) s.meta.endings.push(which);
  if (which === 'quota') {
    c.endless = c.day;
    return true;
  }
  const before = s.meta.echoes;
  caveIn(g, 'song');
  // the song pays every Echo three times over
  const extra = s.caveIn!.echoes.mul(ENDLESS.songEchoes - 1);
  s.meta.echoes = before.add(s.caveIn!.echoes.mul(ENDLESS.songEchoes));
  s.meta.echoesEver = s.meta.echoesEver.add(extra);
  s.caveIn!.echoes = s.caveIn!.echoes.mul(ENDLESS.songEchoes);
  s.meta.newSong++;
  return true;
}

/** Sing it down: end the contract on purpose at night and take the Echoes. */
export function singDown(g: Game): boolean {
  if (g.s.phase !== 'night') return false;
  caveIn(g, 'sung');
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
export function caveIn(g: Game, why: CaveIn['why'] = 'short'): void {
  const s = g.s;
  const c = s.contract;
  const echoes = contractEchoes(g);
  s.meta.echoes = s.meta.echoes.add(echoes);
  s.meta.echoesEver = s.meta.echoesEver.add(echoes);
  s.meta.contracts++;
  s.caveIn = { contract: c.n, days: c.survived, coal: c.coal, verses: c.versesFound.length, echoes, why };
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
  // a promotion needs a hand to promote; the Lone Foreman hires nobody
  const crew = id === 'hand' || (ROLE_IDS as readonly string[]).includes(id);
  if (crew && s.contract.foreman === 'lone') return false;
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

export interface SignOpts {
  foreman?: ForemanId;
  seam?: SeamId;
}

/** Sign a new contract with the Company and start its first day. */
export function signContract(g: Game, seed: number, opts: SignOpts = {}): void {
  const s = g.s;
  const c = newContract(s.meta.contracts + 1, seed);
  c.foreman = opts.foreman && foremanOpen(g, opts.foreman) ? opts.foreman : 'apprentice';
  c.seam = opts.seam && seamOpen(g, opts.seam) ? opts.seam : 'openCut';
  c.bestBefore = s.meta.bestDay;
  if (c.foreman !== 'lone') c.levels.hand = BOOK_FX.oldHands * s.meta.book.oldHands;
  // Seniority: start part-way up, with the crew those days would have hired
  if (s.meta.book.seniority > 0) {
    c.day = Math.max(1, Math.floor(s.meta.bestDay * UNION.seniorityShare));
    if (c.foreman !== 'lone') c.levels.hand += (c.day - 1) * UNION.seniorityHands;
  }
  c.firstDay = c.day;
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

/** Night-shift pay: time away pays a share of the crew's day as scrip, and a little copper, tin and iron.
 * Only at night; never plays a day or ends a contract (ADR-H005). */
export function awayPay(g: Game, awayS: number): { scrip: Decimal; ore: number } {
  const s = g.s;
  if (s.phase !== 'night' || awayS < AWAY.minS) return { scrip: ZERO(), ore: 0 };
  const t = Math.min(awayS, AWAY.capH * 3600);
  const pay = D(crewRate(s) * t * AWAY.share * scripMult(s)).floor();
  s.contract.scrip = s.contract.scrip.add(pay);
  const ore = Math.floor(crewRate(s) * t * AWAY.ore);
  const each = Math.floor(ore / 3);
  for (const k of ['copper', 'tin', 'iron'] as const) s.contract.ores[k] += each;
  return { scrip: pay, ore: each * 3 };
}

/** Let the Overman run it: tomorrow is played without the Foreman, the crew at a share, and settled at dusk. */
export function overmanDay(g: Game): boolean {
  const s = g.s;
  if (s.phase !== 'night' || s.meta.book.overman <= 0 || hands(s) <= 0) return false;
  s.contract.day++;
  startDay(g);
  const d = g.day!;
  d.overman = true;
  // the Foreman stays up top; the day runs in coarse steps (crews and putters only)
  const idle = idleControl();
  const running = (): boolean => (s.phase as string) === 'day';
  while (running()) stepDay(g, idle, OVERMAN.stepS);
  d.dusk = DAY.duskS;
  g.events.length = 0;
  settleDusk(g);
  return true;
}

/** Seconds of daylight left, for the HUD. */
export const daylightLeft = (g: Game): number =>
  g.day ? Math.max(0, g.day.length - g.day.t) : dayLength(g.s);
export const duskDone = (g: Game): boolean => !!g.day && g.s.phase === 'dusk' && g.day.dusk >= DAY.duskS;

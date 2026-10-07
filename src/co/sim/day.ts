// One day underground: dig, carry, deposit at the kibble, beat the clock. hybrid canon §2–§11. Pure.
import { SHAFT_X, SKY_ROWS, ftFromDepthTiles } from '../../data/constants';
import { M, MATERIALS, canDig } from '../../data/materials';
import { D, ZERO, type Decimal } from '../../sim/decimal';
import { makeRng } from '../../sim/rng';
import {
  CHEST,
  CREW,
  DAY,
  DIG,
  DROPS,
  GEM,
  GEMS,
  GOLD_SCRIP,
  KIT,
  ORE_IDS,
  RELICS,
  SHAFT,
  hardnessAt,
  type GemId,
  type OreId,
  type RelicId,
} from '../data/co';
import { chest as chestOf, newBody, stepBody, type Control } from './body';
import { daySeed, makeMine, shaftFoot } from './mine';
import { zeroOres, type DayRun, type Game, type Gang } from './state';
import {
  blastRadius,
  charges,
  chestMult,
  crewRate,
  dayLength,
  handMult,
  hands,
  jetFuel,
  ladders,
  oreMult,
  packCap,
  pickPower,
  pickTier,
  quota,
  runMult,
  shaftDepth,
} from './stats';

/** Dawn: build the day's mine and put the Foreman at the headframe. */
export function startDay(g: Game): void {
  const s = g.s;
  const depth = shaftDepth(s);
  const w = makeMine(daySeed(s.contract.seed, s.contract.day), depth);
  g.world = w;
  const sx = SHAFT_X + 2;
  const b = newBody(sx + 0.5, w.surf[sx] ?? SKY_ROWS);
  b.facing = -1;
  b.jetFuel = jetFuel(s);
  g.day = {
    t: 0,
    length: dayLength(s),
    quota: quota(s, s.contract.day),
    deposited: ZERO(),
    byHand: ZERO(),
    byCrew: ZERO(),
    oreScrip: ZERO(),
    chestScrip: ZERO(),
    ores: zeroOres(),
    body: b,
    pack: { coal: ZERO(), ores: zeroOres() },
    ladders: ladders(s),
    charges: charges(s),
    dig: null,
    rush: { chain: 0, x: -9, y: -9, idle: 0 },
    bombs: [],
    gangs: makeGangs(g, depth),
    crewPop: 0,
    bell: false,
    met: false,
    dusk: 0,
    warnT: 0,
    late: ZERO(),
  };
  s.phase = 'day';
  s.tally = null;
}

/** Gangs start off the shaft, one row each, alternating sides, then tunnel after the nearest coal or ore. */
function makeGangs(g: Game, depth: number): Gang[] {
  const n = hands(g.s);
  const shown = Math.min(CREW.shown, Math.ceil(n / CREW.perGang));
  const top = g.world!.surf[SHAFT_X] ?? SKY_ROWS;
  const out: Gang[] = [];
  for (let i = 0; i < shown; i++) {
    const d = 3 + i * 3;
    if (d > depth) break;
    const side = i % 2 === 0 ? 1 : -1;
    const left = n - i * CREW.perGang;
    out.push({
      x: SHAFT_X + side,
      y: top + d,
      home: top + d,
      side,
      work: 0,
      count: Math.max(1, Math.min(CREW.perGang, left)),
      stuck: false,
      target: null,
      bad: [],
    });
  }
  // the last gang takes the rest of the crew, so banners add up to the whole payroll
  const last = out[out.length - 1];
  if (last) last.count = Math.max(1, n - (out.length - 1) * CREW.perGang);
  return out;
}

export const packOre = (d: DayRun): number => ORE_IDS.reduce((a, k) => a + d.pack.ores[k], 0);
const packUsed = (d: DayRun): number => d.pack.coal.toNumber() + packOre(d);

/** Put drops in the pack; whatever does not fit is lost. Returns what went in. */
function take(g: Game, m: number, mult: number): { coal: number; ore: number; oreId: OreId | null } {
  const d = g.day!;
  const drop = DROPS[m];
  if (!drop) return { coal: 0, ore: 0, oreId: null };
  const room = Math.max(0, packCap(g.s) - packUsed(d));
  const n = Math.min(room, Math.round(drop.n * mult));
  if (n < Math.round(drop.n * mult) && d.warnT <= 0) {
    g.events.push({ t: 'full' });
    d.warnT = 1.2;
  }
  if (n <= 0) return { coal: 0, ore: 0, oreId: null };
  if (drop.kind === 'coal') {
    d.pack.coal = d.pack.coal.add(n);
    return { coal: n, ore: 0, oreId: null };
  }
  d.pack.ores[drop.ore] += n;
  return { coal: 0, ore: n, oreId: drop.ore };
}

/** Break a tile: verses, drops and the world. */
function breakTile(g: Game, x: number, y: number, byHand: boolean): void {
  const w = g.world!;
  const d = g.day!;
  const m = w.get(x, y);
  if (m === M.CARVING) {
    const c = w.carvings.find((k) => k.x === x && k.y === y);
    if (c) findVerse(g, c.verse);
  }
  let rush = 1;
  if (byHand && DROPS[m]) {
    const near = Math.abs(x - d.rush.x) <= 1 && Math.abs(y - d.rush.y) <= 1;
    d.rush.chain = near ? d.rush.chain + 1 : 0;
    d.rush.x = x;
    d.rush.y = y;
    d.rush.idle = 0;
    rush = Math.min(DIG.rushMax, 1 + DIG.rushStep * d.rush.chain);
  }
  const got = take(g, m, rush);
  w.set(x, y, M.AIR);
  g.events.push({ t: 'break', x, y, m, coal: got.coal, ore: got.ore, oreId: got.oreId, rush });
}

function findVerse(g: Game, v: number): void {
  const c = g.s.contract;
  const first = !g.s.meta.verses.includes(v);
  if (first) g.s.meta.verses.push(v);
  if (!c.versesFound.includes(v)) c.versesFound.push(v);
  g.events.push({ t: 'verse', verse: v, first });
}

/** The tile the pick would hit: the first solid tile from the chest toward the aim, within reach. */
export function aimTile(g: Game, c: Control): { x: number; y: number } | null {
  const w = g.world!;
  const b = g.day!.body;
  const o = chestOf(b);
  let dx = c.aimX - o.x;
  let dy = c.aimY - o.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) return null;
  dx /= len;
  dy /= len;
  const reach = Math.min(DIG.reach, len + 0.6);
  for (let t = 0; t <= reach; t += 0.05) {
    const x = Math.floor(o.x + dx * t);
    const y = Math.floor(o.y + dy * t);
    if (y < 0) continue;
    const m = w.get(x, y);
    if (m !== M.AIR) return MATERIALS[m]?.hardness ? { x, y } : null;
  }
  return null;
}

/** Seconds to break a tile by hand. hybrid canon §5 */
export function digSeconds(g: Game, x: number, y: number): number {
  const w = g.world!;
  const h = hardnessAt(w.hardnessOf(x, y), ftFromDepthTiles(w.depth(y)));
  return h / (pickPower(g.s) * DIG.k * handMult(g.s));
}

function dig(g: Game, c: Control, dt: number): void {
  const d = g.day!;
  const w = g.world!;
  d.rush.idle += dt;
  if (d.rush.idle > DIG.rushIdleS) d.rush.chain = 0;
  if (!c.fire) {
    d.dig = null;
    return;
  }
  const t = aimTile(g, c);
  if (!t) {
    d.dig = null;
    return;
  }
  const m = w.get(t.x, t.y);
  if (!canDig(m, pickTier(g.s))) {
    if (d.warnT <= 0) {
      g.events.push({ t: 'refused', x: t.x, y: t.y });
      d.warnT = 0.6;
    }
    d.dig = null;
    return;
  }
  if (!d.dig || d.dig.x !== t.x || d.dig.y !== t.y)
    d.dig = { x: t.x, y: t.y, t: 0, need: digSeconds(g, t.x, t.y) };
  d.dig.t += dt;
  d.rush.idle = 0;
  if (Math.floor((d.dig.t - dt) / 0.16) !== Math.floor(d.dig.t / 0.16))
    g.events.push({ t: 'chip', x: t.x, y: t.y, m });
  if (d.dig.t >= d.dig.need) {
    breakTile(g, t.x, t.y, true);
    d.dig = null;
  }
}

function throwCharge(g: Game, c: Control): void {
  const d = g.day!;
  if (d.charges <= 0) {
    if (d.warnT <= 0) {
      g.events.push({ t: 'refused', x: Math.floor(d.body.x), y: Math.floor(d.body.y - 1) });
      d.warnT = 0.6;
    }
    return;
  }
  d.charges--;
  const o = chestOf(d.body);
  const dx = c.aimX - o.x;
  const dy = c.aimY - o.y;
  const len = Math.max(0.01, Math.hypot(dx, dy));
  const k = Math.min(1, len / 6) * KIT.throwSpeed;
  d.bombs.push({
    x: o.x,
    y: o.y,
    vx: (dx / len) * k + d.body.vx * 0.3,
    vy: (dy / len) * k - 3,
    fuse: KIT.fuseS,
  });
}

function stepBombs(g: Game, dt: number): void {
  const d = g.day!;
  const w = g.world!;
  for (const bm of d.bombs) {
    bm.vy = Math.min(20, bm.vy + 40 * dt);
    const nx = bm.x + bm.vx * dt;
    if (w.get(Math.floor(nx), Math.floor(bm.y)) !== M.AIR) bm.vx *= -0.3;
    else bm.x = nx;
    const ny = bm.y + bm.vy * dt;
    if (w.get(Math.floor(bm.x), Math.floor(ny)) !== M.AIR) {
      bm.vy *= -0.25;
      bm.vx *= 0.6;
    } else bm.y = ny;
    bm.fuse -= dt;
  }
  for (const bm of d.bombs.filter((b) => b.fuse <= 0)) {
    const r = blastRadius(g.s);
    const cx = Math.floor(bm.x);
    const cy = Math.floor(bm.y);
    // a charge breaks one tier harder than the pick, so it opens the next band early
    const tier = pickTier(g.s) + 1;
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > (r + 0.5) ** 2) continue;
        const m = w.get(x, y);
        if (m === M.AIR || m === M.BEDROCK || !canDig(m, tier)) continue;
        if (x === SHAFT_X && w.objects[String(w.idx(x, y))] === 'rope') continue;
        breakTile(g, x, y, false);
      }
    g.events.push({ t: 'boom', x: bm.x, y: bm.y, r });
  }
  d.bombs = d.bombs.filter((b) => b.fuse > 0);
}

function placeLadder(g: Game): void {
  const d = g.day!;
  const w = g.world!;
  const x = Math.floor(d.body.x);
  const y = Math.floor(d.body.y - 0.5);
  const k = String(w.idx(x, y));
  if (d.ladders <= 0 || w.get(x, y) !== M.AIR || w.objects[k]) {
    if (d.warnT <= 0) {
      g.events.push({ t: 'refused', x, y });
      d.warnT = 0.4;
    }
    return;
  }
  w.objects[k] = 'rope';
  w.redraw(x, y);
  d.ladders--;
  g.events.push({ t: 'ladder', x, y });
}

function openChests(g: Game): void {
  const d = g.day!;
  const w = g.world!;
  const b = d.body;
  for (const yy of [b.y - 0.3, b.y - 1.1]) {
    const x = Math.floor(b.x);
    const y = Math.floor(yy);
    const k = String(w.idx(x, y));
    if (w.objects[k] !== 'chest') continue;
    delete w.objects[k];
    w.redraw(x, y);
    const rng = makeRng(g.s.rng);
    const scrip = D(CHEST.base * (1 + Math.max(0, w.depth(y)) / CHEST.depthDiv) * (0.7 + rng.next() * 0.6))
      .mul(chestMult(g.s))
      .floor();
    let relic: RelicId | null = null;
    if (rng.next() < CHEST.relic) {
      const left = (Object.keys(RELICS) as RelicId[]).filter((r) => !g.s.contract.relics.includes(r));
      if (left.length) relic = left[rng.int(0, left.length - 1)]!;
    }
    // deep chests can hold a gem worth far more than the coin (hybrid canon §15)
    let gem: GemId | null = null;
    let total = scrip;
    const depth = Math.max(0, w.depth(y));
    if (depth >= GEM.minDepth && rng.next() < GEM.chance) {
      gem = pickGem(rng.next());
      total = total.add(
        D(GEMS[gem].scrip * (1 + depth / GEM.depthDiv))
          .mul(chestMult(g.s))
          .floor(),
      );
    }
    g.s.rng = rng.state();
    g.s.contract.scrip = g.s.contract.scrip.add(total);
    d.chestScrip = d.chestScrip.add(total);
    if (relic) g.s.contract.relics.push(relic);
    g.events.push({ t: 'chest', x, y, scrip: total, relic, gem });
  }
}

/** A gem by weight, from a roll in [0, 1). */
export function pickGem(roll: number): GemId {
  const ids = Object.keys(GEMS) as GemId[];
  const sum = ids.reduce((a, k) => a + GEMS[k].weight, 0);
  let t = roll * sum;
  for (const k of ids) {
    t -= GEMS[k].weight;
    if (t < 0) return k;
  }
  return ids[ids.length - 1]!;
}

/** Near the kibble at the headframe, or at the shaft foot once it has one. */
export function atKibble(g: Game): { x: number; y: number } | null {
  const w = g.world!;
  const b = g.day!.body;
  const top = { x: SHAFT_X + 0.5, y: w.surf[SHAFT_X] ?? SKY_ROWS };
  if (Math.abs(b.x - top.x) <= SHAFT.kibbleReach && Math.abs(b.y - top.y) <= 1.2) return top;
  if (g.s.contract.levels.footKibble > 0) {
    const f = shaftFoot(w, shaftDepth(g.s));
    const foot = { x: f.x + 0.5, y: f.y + 1 };
    if (Math.abs(b.x - foot.x) <= SHAFT.kibbleReach && Math.abs(b.y - foot.y) <= 1.2) return foot;
  }
  return null;
}

/** Ore into the contract's stock; gold is sold on the spot. Returns the scrip the gold fetched. */
function bankOre(g: Game, ore: OreId, n: number): Decimal {
  const d = g.day!;
  if (n <= 0) return ZERO();
  d.ores[ore] += n;
  if (ore === 'gold') {
    const scrip = D(GOLD_SCRIP * n)
      .mul(oreMult(g.s))
      .floor();
    d.oreScrip = d.oreScrip.add(scrip);
    g.s.contract.scrip = g.s.contract.scrip.add(scrip);
    return scrip;
  }
  g.s.contract.ores[ore] += n;
  return ZERO();
}

function deposit(g: Game, share = 1): void {
  const d = g.day!;
  if (packUsed(d) <= 0) return;
  const coal = d.pack.coal.mul(share).floor();
  let scrip = ZERO();
  let ores = 0;
  for (const k of ORE_IDS) {
    const n = Math.floor(d.pack.ores[k] * share);
    ores += n;
    scrip = scrip.add(bankOre(g, k, n));
  }
  d.deposited = d.deposited.add(coal);
  d.byHand = d.byHand.add(coal);
  g.s.contract.coal = g.s.contract.coal.add(coal);
  const at = atKibble(g) ?? { x: d.body.x, y: d.body.y };
  g.events.push({ t: 'deposit', coal, scrip, ores, x: at.x, y: at.y });
  d.pack = { coal: ZERO(), ores: zeroOres() };
}

/** The nearest coal or ore tile a gang can break, within its band of rows. Ore counts as a little nearer. */
function findVein(g: Game, gang: Gang, tier: number): { x: number; y: number } | null {
  const w = g.world!;
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  const r = CREW.seek;
  for (let y = gang.y - r; y <= gang.y + r; y++) {
    if (Math.abs(y - gang.home) > CREW.band) continue;
    for (let x = gang.x - r; x <= gang.x + r; x++) {
      if (x <= 1 || x >= w.w - 2 || x === SHAFT_X) continue;
      const m = w.get(x, y);
      const drop = DROPS[m];
      if (!drop || !canDig(m, tier) || gang.bad.includes(w.idx(x, y))) continue;
      const dist = Math.abs(x - gang.x) + Math.abs(y - gang.y) - (drop.kind === 'ore' ? 2 : 0);
      if (dist < bestD) {
        bestD = dist;
        best = { x, y };
      }
    }
  }
  return best;
}

/** A gang breaks a tile: coal goes up with the crew's coal, ore goes into stock. */
function gangBreak(g: Game, x: number, y: number): void {
  const w = g.world!;
  const d = g.day!;
  const m = w.get(x, y);
  const drop = DROPS[m];
  w.set(x, y, M.AIR);
  if (!drop) return;
  if (drop.kind === 'coal') {
    d.deposited = d.deposited.add(drop.n);
    d.byCrew = d.byCrew.add(drop.n);
    g.s.contract.coal = g.s.contract.coal.add(drop.n);
    d.crewPop += drop.n;
  } else {
    bankOre(g, drop.ore, drop.n);
    g.events.push({ t: 'crewOre', x, y, ore: drop.ore, n: drop.n });
  }
}

/** One unit of gang work: step toward the vein, breaking the first solid tile in the way. hybrid canon §8 */
function gangStep(g: Game, gang: Gang, tier: number): void {
  const w = g.world!;
  if (gang.target && w.get(gang.target.x, gang.target.y) === M.AIR) gang.target = null;
  if (!gang.target) gang.target = findVein(g, gang, tier);
  let nx = gang.x;
  let ny = gang.y;
  const t = gang.target;
  if (t) {
    // stand beside the target, feet on its row or the row below
    if (t.x !== gang.x) nx += Math.sign(t.x - gang.x);
    else if (t.y > gang.y) ny++;
    else if (t.y < gang.y - 1) ny--;
  } else nx += gang.side;
  if (nx <= 1 || nx >= w.w - 2 || nx === SHAFT_X || Math.abs(ny - gang.home) > CREW.band) {
    if (t) gang.bad.push(w.idx(t.x, t.y));
    gang.target = null;
    if (!t) gang.stuck = true;
    return;
  }
  // the tiles the gang would stand in at (nx, ny): head and feet
  for (const yy of [ny - 1, ny]) {
    const m = w.get(nx, yy);
    if (m === M.AIR) continue;
    if (m === M.CARVING || m === M.BEDROCK || !canDig(m, tier) || w.objects[String(w.idx(nx, yy))]) {
      if (t) gang.bad.push(w.idx(t.x, t.y));
      gang.target = null;
      if (!t) gang.stuck = true;
      return;
    }
    gangBreak(g, nx, yy);
    return;
  }
  gang.x = nx;
  gang.y = ny;
  // keep feet on something: drop down through open air within the band
  while (w.get(gang.x, gang.y + 1) === M.AIR && gang.y + 1 - gang.home <= CREW.band) gang.y++;
}

function stepGangs(g: Game, dt: number): void {
  const tier = pickTier(g.s);
  for (const gang of g.day!.gangs) {
    if (gang.stuck) continue;
    gang.work += CREW.gangDig * Math.min(3, 1 + gang.count / 25) * dt;
    while (gang.work >= 1) {
      gang.work -= 1;
      gangStep(g, gang, tier);
    }
  }
}

/** Advance the day by dt seconds under the player's control. */
export function stepDay(g: Game, c: Control, dt: number): void {
  const s = g.s;
  const d = g.day;
  if (!d || !g.world) return;
  if (s.phase === 'dusk') {
    d.dusk += dt;
    return;
  }
  if (s.phase !== 'day') return;
  d.warnT = Math.max(0, d.warnT - dt);
  const r = stepBody(
    g.world,
    d.body,
    c,
    { runMult: runMult(s), doubleJump: s.contract.levels.doubleJump > 0, jetFuelS: jetFuel(s) },
    dt,
  );
  if (r === 'jump') g.events.push({ t: 'jump' });
  else if (typeof r === 'number') g.events.push({ t: 'land', speed: r });
  if (c.ladderPressed) placeLadder(g);
  if (c.throwPressed) throwCharge(g, c);
  dig(g, c, dt);
  stepBombs(g, dt);
  openChests(g);
  if (atKibble(g)) deposit(g);

  // the crew sends coal up all day
  const crew = crewRate(s) * dt;
  if (crew > 0) {
    d.deposited = d.deposited.add(crew);
    d.byCrew = d.byCrew.add(crew);
    s.contract.coal = s.contract.coal.add(crew);
    d.crewPop += crew;
  }
  stepGangs(g, dt);

  if (!d.met && d.deposited.gte(d.quota)) {
    d.met = true;
    g.events.push({ t: 'quotaMet' });
  }
  d.t += dt;
  if (!d.bell && d.t >= d.length - DAY.lastBellS) {
    d.bell = true;
    g.events.push({ t: 'lastBell' });
  }
  if (d.t >= d.length) {
    // the late tally: what is still in the pack counts at half
    const before = d.deposited;
    deposit(g, DAY.lateTally);
    d.late = d.deposited.sub(before);
    s.phase = 'dusk';
    d.dusk = 0;
    g.events.push({ t: 'dusk' });
  }
}

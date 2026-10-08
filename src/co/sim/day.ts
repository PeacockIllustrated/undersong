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
  ENDLESS,
  GEM,
  GEMS,
  GOLD_SCRIP,
  HEAT,
  HOT,
  KIT,
  MORTAR,
  OVERMAN,
  FOREMAN_FX,
  ORE_IDS,
  RELICS,
  ROLE_FX,
  SEAM_FX,
  STEP_S as STEP,
  SHAFT,
  VEIN_BREAK,
  hardnessAt,
  type GemId,
  type OreId,
  type RelicId,
} from '../data/co';
import { chest as chestOf, newBody, stepBody, type Control } from './body';
import { lanceMult, placePlatform, selectTool, stepTools, useTool } from './tools';
import { daySeed, makeMine, shaftFoot } from './mine';
import { zeroOres, type DayRun, type Game, type Gang, type ToolUse } from './state';
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
  led,
  oreMult,
  packCap,
  pickPower,
  pickTier,
  platforms,
  quota,
  role,
  runMult,
  shaftDepth,
} from './stats';

/** Dawn: build the day's mine and put the Foreman at the headframe. */
export function startDay(g: Game): void {
  const s = g.s;
  const depth = shaftDepth(s);
  const w = makeMine(daySeed(s.contract.seed, s.contract.day), depth, s.contract.seam);
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
    spill: { coal: 0, ores: zeroOres() },
    byHaul: ZERO(),
    haulPop: 0,
    haulWork: 0,
    ladders: ladders(s),
    charges: charges(s),
    dig: null,
    rush: { chain: 0, x: -9, y: -9, idle: 0 },
    tool: 'pick',
    toolCd: 0,
    shells: [],
    shellsLeft: MORTAR.perLevel * s.contract.levels.mortar,
    rigs: [],
    rigsLeft: s.contract.levels.drill,
    platforms: platforms(s),
    plat: {},
    toolTiles: {},
    cracks: {},
    waterline: w.h,
    overman: false,
    heat: 0,
    bombs: [],
    gangs: makeGangs(g, depth),
    crewPop: 0,
    bell: false,
    met: false,
    dusk: 0,
    warnT: 0,
    late: ZERO(),
  };
  drainWater(g);
  s.phase = 'day';
  s.tally = null;
}

/** Pumpmen drain the flooded tiles nearest the shaft before the day starts (canon §8.1). */
function drainWater(g: Game): void {
  const w = g.world!;
  let left = role(g.s, 'pumpman') * ROLE_FX.pumpTiles;
  if (left <= 0) return;
  const wet: number[] = [];
  for (let i = 0; i < w.water.length; i++) if (w.water[i]! > 0) wet.push(i);
  const top = w.surf[SHAFT_X] ?? SKY_ROWS;
  const dist = (i: number): number =>
    Math.abs((i % w.w) - SHAFT_X) + Math.abs(Math.floor(i / w.w) - top) * 0.5;
  wet.sort((a, b) => dist(a) - dist(b));
  for (const i of wet) {
    if (left-- <= 0) break;
    w.water[i] = 0;
  }
  w.touchAll();
}

/** Gangs start off the shaft, a row every three tiles on alternating sides, then tunnel after the nearest coal
 * or ore. Past the shaft's depth, more gangs start further out along the same rows. */
function makeGangs(g: Game, depth: number): Gang[] {
  const n = hands(g.s);
  const want = Math.min(CREW.shown, Math.ceil(n / CREW.perGang));
  const top = g.world!.surf[SHAFT_X] ?? SKY_ROWS;
  const rows = Math.max(1, Math.floor((depth - 3) / 3) + 1);
  const out: Gang[] = [];
  for (let i = 0; i < want; i++) {
    const row = i % rows;
    const lap = Math.floor(i / rows);
    const y = top + 3 + row * 3;
    const side: -1 | 1 = (i + lap) % 2 === 0 ? 1 : -1;
    const x = SHAFT_X + side * (1 + lap * 6);
    if (x <= 1 || x >= g.world!.w - 2) break;
    out.push({ x, y, home: y, side, work: 0, count: CREW.perGang, stuck: false, target: null, bad: [] });
  }
  // the last gang takes the rest of the crew, so banners add up to the whole payroll
  const last = out[out.length - 1];
  if (last) last.count = Math.max(1, n - (out.length - 1) * CREW.perGang);
  // a gang that starts inside rock opens its own standing room
  for (const gang of out)
    for (const yy of [gang.y - 1, gang.y])
      if (g.world!.get(gang.x, yy) !== M.BEDROCK) g.world!.set(gang.x, yy, M.AIR);
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
  // the Stoker: hot rock pays double
  const hot = led(g.s, 'stoker') && HOT.includes(m) ? FOREMAN_FX.stokerHot : 1;
  const want = Math.round(drop.n * mult * hot);
  const n = Math.min(room, want);
  if (n < want) {
    // with putters, what does not fit waits at the face for them; without, it is lost
    if (role(g.s, 'putter') > 0) {
      if (drop.kind === 'coal') d.spill.coal += want - n;
      else d.spill.ores[drop.ore] += want - n;
    }
    if (d.warnT <= 0) {
      g.events.push({ t: 'full' });
      d.warnT = 1.2;
    }
  }
  if (n <= 0) return { coal: 0, ore: 0, oreId: null };
  if (drop.kind === 'coal') {
    d.pack.coal = d.pack.coal.add(n);
    return { coal: n, ore: 0, oreId: null };
  }
  d.pack.ores[drop.ore] += n;
  return { coal: 0, ore: n, oreId: drop.ore };
}

/** Break a tile: verses, drops and the world. `by` names the tool, for the tool-share count. */
export function breakTile(g: Game, x: number, y: number, byHand: boolean, by: ToolUse = 'pick'): void {
  const w = g.world!;
  const d = g.day!;
  const m = w.get(x, y);
  d.toolTiles[by] = (d.toolTiles[by] ?? 0) + 1;
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
  if (byHand && DROPS[m] && d.rush.chain === VEIN_BREAK.at) veinBreak(g, x, y, m, rush);
}

/** Vein Break: a long enough Vein Rush shatters the rest of the vein it is in, straight into the pack. */
function veinBreak(g: Game, x0: number, y0: number, m: number, rush: number): void {
  const w = g.world!;
  const tier = pickTier(g.s);
  const seen = new Set<number>([w.idx(x0, y0)]);
  const queue = [[x0, y0] as const];
  const hit: [number, number][] = [];
  while (queue.length && hit.length < VEIN_BREAK.max) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (!w.inside(nx, ny) || seen.has(w.idx(nx, ny))) continue;
      seen.add(w.idx(nx, ny));
      if (w.get(nx, ny) !== m || !canDig(m, tier)) continue;
      hit.push([nx, ny]);
      queue.push([nx, ny]);
      if (hit.length >= VEIN_BREAK.max) break;
    }
  }
  if (!hit.length) return;
  let coal = 0;
  let ore = 0;
  for (const [x, y] of hit) {
    const got = take(g, m, rush);
    coal += got.coal;
    ore += got.ore;
    w.set(x, y, M.AIR);
    g.events.push({ t: 'chip', x, y, m });
  }
  g.events.push({ t: 'veinBreak', x: x0, y: y0, m, n: hit.length, coal, ore });
}

function findVerse(g: Game, v: number): void {
  const c = g.s.contract;
  const first = !g.s.meta.verses.includes(v);
  if (first) g.s.meta.verses.push(v);
  if (!c.versesFound.includes(v)) c.versesFound.push(v);
  // Verse XII: the choice waits at the end of the day (H7)
  if (v === ENDLESS.verse && !c.endless) c.choice = true;
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
  const lance = g.day?.tool === 'lance' && HOT.includes(w.get(x, y)) ? lanceMult(g.s) : 1;
  return h / (pickPower(g.s) * DIG.k * handMult(g.s) * lance);
}

function dig(g: Game, c: Control, dt: number): void {
  const d = g.day!;
  const w = g.world!;
  d.rush.idle += dt;
  if (d.rush.idle > DIG.rushIdleS) d.rush.chain = 0;
  if (!c.fire || (d.tool !== 'pick' && d.tool !== 'lance')) {
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
    breakTile(g, t.x, t.y, true, d.tool === 'lance' ? 'lance' : 'pick');
    // the Woodcutter's axe cleaves: the rock above and below the cut goes too
    if (led(g.s, 'woodcutter'))
      for (const yy of [t.y - 1, t.y + 1]) {
        const mm = w.get(t.x, yy);
        if (mm !== M.AIR && mm !== M.BEDROCK && mm !== M.CARVING && canDig(mm, pickTier(g.s)))
          if (w.objects[String(w.idx(t.x, yy))] !== 'rope') breakTile(g, t.x, yy, false, 'pick');
      }
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
        breakTile(g, x, y, false, 'charge');
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

/** Chests the Foreman stands in, or, for the Dog-handler, any chest Biscuit can reach. */
function chestsInReach(g: Game): { x: number; y: number }[] {
  const d = g.day!;
  const w = g.world!;
  const b = d.body;
  const out = [b.y - 0.3, b.y - 1.1].map((yy) => ({ x: Math.floor(b.x), y: Math.floor(yy) }));
  if (led(g.s, 'doghandler')) {
    const r = FOREMAN_FX.dogFetch;
    for (const k of Object.keys(w.objects)) {
      if (w.objects[k] !== 'chest') continue;
      const i = Number(k);
      const x = i % w.w;
      const y = Math.floor(i / w.w);
      if (Math.hypot(x + 0.5 - b.x, y + 0.5 - (b.y - 0.7)) <= r) out.push({ x, y });
    }
  }
  return out;
}

function openChests(g: Game): void {
  const d = g.day!;
  const w = g.world!;
  for (const { x, y } of chestsInReach(g)) {
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
  if (g.s.contract.levels.footKibble > 0 || g.s.contract.seam === 'geode') {
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
export function gangBreak(g: Game, x: number, y: number): void {
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
  const fire = role(g.s, 'shotfirer');
  const tier = pickTier(g.s) + (fire > 0 ? 1 : 0);
  const gangs = g.day!.gangs;
  const blast = 1 + (ROLE_FX.shotfirerDig * fire) / Math.max(1, gangs.length);
  for (const gang of gangs) {
    if (gang.stuck) continue;
    gang.work += CREW.gangDig * Math.min(3, 1 + gang.count / 25) * blast * dt;
    while (gang.work >= 1) {
      gang.work -= 1;
      gangStep(g, gang, tier);
    }
  }
}

/** The Drowned Street: the water climbs the funnel from its foot through the day. Pumpmen slow it. */
function rise(g: Game): void {
  const d = g.day!;
  const w = g.world!;
  if (g.s.contract.seam !== 'drowned') return;
  const f = SEAM_FX.drowned;
  const top = w.surf[SHAFT_X] ?? SKY_ROWS;
  const slow = Math.min(f.pumpMax, f.pump * role(g.s, 'pumpman'));
  const p = Math.min(1, (d.t / d.length) * (1 - slow));
  const line = Math.round(top + f.depth - (f.depth - f.riseTo) * p);
  const foot = top + f.depth;
  const fill = (from: number): void => {
    for (let y = from; y <= foot; y++)
      for (let x = 1; x < w.w - 1; x++) {
        const i = y * w.w + x;
        if (w.mat[i] === M.AIR && w.water[i]! < 8) {
          w.water[i] = 8;
          w.redraw(x, y);
        }
      }
  };
  if (line < d.waterline) {
    if (d.waterline > foot) d.waterline = foot + 1;
    fill(line);
    d.waterline = line;
    g.events.push({ t: 'rising', y: line });
  } else if (Math.floor(d.t) !== Math.floor(d.t - STEP)) fill(d.waterline);
}

/** Heat: deep down (or shallow, in the Chimney) the Foreman cooks unless the cold lance is in hand or the Stoker leads. */
function stepHeat(g: Game, dt: number): void {
  const d = g.day!;
  const w = g.world!;
  const from = g.s.contract.seam === 'chimney' ? SEAM_FX.chimney.heatD : HEAT.fromD;
  const safe = d.tool === 'lance' || led(g.s, 'stoker');
  const hot = !safe && w.depth(d.body.y - 1) >= from;
  d.heat = Math.max(0, Math.min(1, d.heat + (hot ? HEAT.rise : -HEAT.fall) * dt));
  if (d.heat < 1) return;
  // overcome: hauled up to the kibble, half the pack spilled on the way
  const lost = Math.floor(packUsed(d) / 2);
  d.pack.coal = d.pack.coal.mul(0.5).floor();
  for (const k of ORE_IDS) d.pack.ores[k] = Math.floor(d.pack.ores[k] / 2);
  d.body.x = SHAFT_X + 1.5;
  d.body.y = w.surf[SHAFT_X + 1] ?? SKY_ROWS;
  d.body.vx = d.body.vy = 0;
  d.heat = 0;
  g.events.push({ t: 'overcome', lost });
}

/** Putters carry the spill up a load at a time: coal first, then ore. */
function haul(g: Game, dt: number): void {
  const d = g.day!;
  const rate = role(g.s, 'putter') * ROLE_FX.putterHaul * (led(g.s, 'doghandler') ? FOREMAN_FX.dogHaul : 1);
  if (rate <= 0) return;
  d.haulWork = Math.min(d.haulWork + rate * dt, 50);
  while (d.haulWork >= 1) {
    if (d.spill.coal >= 1) {
      d.spill.coal -= 1;
      d.deposited = d.deposited.add(1);
      d.byHaul = d.byHaul.add(1);
      g.s.contract.coal = g.s.contract.coal.add(1);
      d.haulPop += 1;
    } else {
      const k = ORE_IDS.find((o) => d.spill.ores[o] > 0);
      if (!k) {
        d.haulWork = 0;
        return;
      }
      d.spill.ores[k] -= 1;
      bankOre(g, k, 1);
    }
    d.haulWork -= 1;
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
    {
      runMult: runMult(s),
      doubleJump: s.contract.levels.doubleJump > 0,
      wings: s.contract.levels.wings > 0,
      jetFuelS: jetFuel(s),
      platform: (x, y) => !!d.plat[g.world!.idx(x, y)],
    },
    dt,
  );
  if (r === 'jump') g.events.push({ t: 'jump' });
  else if (typeof r === 'number') g.events.push({ t: 'land', speed: r });
  if (c.ladderPressed) placeLadder(g);
  if (c.platformPressed) placePlatform(g);
  if (c.throwPressed) throwCharge(g, c);
  selectTool(g, c);
  dig(g, c, dt);
  useTool(g, c, dt);
  stepBombs(g, dt);
  stepTools(g, dt);
  openChests(g);
  if (atKibble(g)) deposit(g);

  // the crew sends coal up all day (a little less with only the Overman watching)
  const crew = crewRate(s) * dt * (d.overman ? OVERMAN.share : 1);
  if (crew > 0) {
    d.deposited = d.deposited.add(crew);
    d.byCrew = d.byCrew.add(crew);
    s.contract.coal = s.contract.coal.add(crew);
    d.crewPop += crew;
  }
  stepGangs(g, dt);
  haul(g, dt);
  rise(g);
  stepHeat(g, dt);

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

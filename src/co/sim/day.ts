// One day underground: dig, carry, deposit at the kibble, beat the clock. hybrid canon §2–§11. Pure.
import { SHAFT_X, SKY_ROWS, ftFromDepthTiles } from '../../data/constants';
import { M, MATERIALS, canDig } from '../../data/materials';
import { D, ZERO } from '../../sim/decimal';
import { makeRng } from '../../sim/rng';
import { CHEST, CREW, DAY, DIG, DROPS, KIT, RELICS, SHAFT, hardnessAt, type RelicId } from '../data/co';
import { chest as chestOf, newBody, stepBody, type Control } from './body';
import { daySeed, makeMine, shaftFoot } from './mine';
import type { DayRun, Game, Gang } from './state';
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
    body: b,
    pack: { coal: ZERO(), ore: 0, oreScrip: ZERO() },
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

/** Gangs work tunnels off the shaft, one row each, alternating sides. Cosmetic pace; their coal is the crew rate. */
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
      y: top + d,
      side,
      x: SHAFT_X + side,
      work: 0,
      count: Math.max(1, Math.min(CREW.perGang, left)),
      stuck: false,
    });
  }
  // the last gang takes the rest of the crew, so banners add up to the whole payroll
  const last = out[out.length - 1];
  if (last) last.count = Math.max(1, n - (out.length - 1) * CREW.perGang);
  return out;
}

const packUsed = (d: DayRun): number => d.pack.coal.toNumber() + d.pack.ore;

/** Put drops in the pack; whatever does not fit is lost. Returns what went in. */
function take(g: Game, m: number, mult: number): { coal: number; ore: number } {
  const d = g.day!;
  const drop = DROPS[m];
  if (!drop) return { coal: 0, ore: 0 };
  const room = Math.max(0, packCap(g.s) - packUsed(d));
  const n = Math.min(room, Math.round(drop.n * mult));
  if (n < Math.round(drop.n * mult) && d.warnT <= 0) {
    g.events.push({ t: 'full' });
    d.warnT = 1.2;
  }
  if (n <= 0) return { coal: 0, ore: 0 };
  if (drop.kind === 'coal') {
    d.pack.coal = d.pack.coal.add(n);
    return { coal: n, ore: 0 };
  }
  d.pack.ore += n;
  d.pack.oreScrip = d.pack.oreScrip.add((drop.scrip ?? 0) * n);
  return { coal: 0, ore: n };
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
  g.events.push({ t: 'break', x, y, m, coal: got.coal, ore: got.ore, rush });
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
    g.s.rng = rng.state();
    g.s.contract.scrip = g.s.contract.scrip.add(scrip);
    d.chestScrip = d.chestScrip.add(scrip);
    if (relic) g.s.contract.relics.push(relic);
    g.events.push({ t: 'chest', x, y, scrip, relic });
  }
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

function deposit(g: Game, share = 1): void {
  const d = g.day!;
  if (packUsed(d) <= 0) return;
  const coal = d.pack.coal.mul(share).floor();
  const scrip = d.pack.oreScrip.mul(share).mul(oreMult(g.s)).floor();
  d.deposited = d.deposited.add(coal);
  d.byHand = d.byHand.add(coal);
  d.oreScrip = d.oreScrip.add(scrip);
  g.s.contract.scrip = g.s.contract.scrip.add(scrip);
  g.s.contract.coal = g.s.contract.coal.add(coal);
  const at = atKibble(g) ?? { x: d.body.x, y: d.body.y };
  g.events.push({ t: 'deposit', coal, scrip, x: at.x, y: at.y });
  d.pack = { coal: ZERO(), ore: 0, oreScrip: ZERO() };
}

function stepGangs(g: Game, dt: number): void {
  const w = g.world!;
  const tier = pickTier(g.s);
  for (const gang of g.day!.gangs) {
    if (gang.stuck) continue;
    gang.work += CREW.gangDig * Math.min(3, 1 + gang.count / 25) * dt;
    if (gang.work < 1) continue;
    gang.work -= 1;
    // the face: walk out past open tunnel, then open the next solid tile of the two-high drift
    for (let guard = 0; guard < 4; guard++) {
      if (gang.x <= 1 || gang.x >= w.w - 2) {
        gang.stuck = true;
        break;
      }
      const y = [gang.y - 1, gang.y].find((yy) => w.get(gang.x, yy) !== M.AIR);
      if (y === undefined) {
        gang.x += gang.side;
        continue;
      }
      const m = w.get(gang.x, y);
      if (m === M.CARVING || m === M.BEDROCK || !canDig(m, tier)) gang.stuck = true;
      else w.set(gang.x, y, M.AIR);
      break;
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

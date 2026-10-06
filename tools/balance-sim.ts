// Headless balance sim: a bot plays like an engaged player and reports time to each canon §5 milestone.
// Usage: npm run sim -- [--seeds=5] [--until=first-cavein] [--minutes=90]
import { TICK_MS, SHAFT_X } from '../src/data/constants';
import { MATERIALS, canDig, isMineable } from '../src/data/materials';
import { lightFactor } from '../src/data/light';
import { apply } from '../src/sim/actions';
import { canCaveIn, echoGain } from '../src/sim/cavein';
import { minerCost, nextHaul, nextPick, canPay } from '../src/sim/economy';
import { buildingCost, buildingOffered, canCraft } from '../src/sim/village';
import { UPGRADES } from '../src/data/upgrades';
import { BIOMES } from '../src/data/biomes';
import { createGame, type Game } from '../src/sim/game';
import { shaftFloor } from '../src/sim/miners';
import { reach, workable } from '../src/sim/reach';
import { step } from '../src/sim/step';
import { NEIGH4 } from '../src/world/world';
import type { ResKey } from '../src/data/resources';
import type { Decimal } from '../src/sim/decimal';
import { line4 } from '../src/sim/geom';
import { CHARMS } from '../src/data/charms';
import { PUMP } from '../src/data/water';
import { canWeave, weaveCost } from '../src/sim/charms';
import { flooded } from '../src/sim/water';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);
const SEEDS = Number(args.seeds ?? 9);
/** How often the bot looks at the screen, in ms. An engaged player, not a perfect one. */
const ATTENTION_MS = Number(args.attention ?? 1500);
const MINUTES = Number(args.minutes ?? 120);
/** Act III mode plays on through the Flooded Halls and the Singing Geodes. */
const ACT3 = args.until === 'act3';
/** Act II mode plays on through Cave-ins until Glowroot is cleared (and on through Act III with --until=act3). */
const ACT2 = args.until === 'act2' || ACT3;
const GLOWROOT = BIOMES[2]!;
const GEODES = BIOMES[4]!;
/** Act II is behind the village once 400 ft has been reached and the Glowroot verses are known. */
const glowrootKnown = (s: Game['state']): boolean =>
  s.verses.known[2] === true && s.verses.known[3] === true && s.verses.known[4] === true;
/** In Act III mode the bot only moves on to the Halls once the Glowroot is behind it, as a player would. */
const inAct3 = (s: Game['state']): boolean => ACT3 && glowrootKnown(s) && s.stats.bestDepthD >= GLOWROOT.d1;
/** The depth the late-game bot digs for. */
const goalD = (s: Game['state']): number => (inAct3(s) ? GEODES.d1 : GLOWROOT.d1);
/** Highest verse (0-based) the bot goes after. */
const lastVerse = (s: Game['state']): number => (inAct3(s) ? 9 : 4);

// canon §5 (ADR-015). A target with `atMost` passes when the median is at or under it.
const TARGETS: [string, string, number, boolean?][] = ACT3
  ? [
      ['glowroot', 'Glowroot cleared (Act II)', 240],
      ['act3', 'Act III end', 540],
    ]
  : ACT2
    ? [['glowroot', 'Glowroot cleared (Act II)', 240]]
    : [
        ['bar', 'First bar smelted', 1, true],
        ['miner', 'First miner hired', 8],
        ['verse0', 'Verse I found', 10],
        ['ft150', '150 ft', 20],
        ['caveInReady', 'First Cave-in available', 45],
      ];

const mins = (ms: number | undefined): string =>
  ms === undefined ? '  —  ' : (ms / 60000).toFixed(1).padStart(5);

function foremanIdle(g: Game): boolean {
  return !g.state.foreman.target && g.state.foreman.queue.length === 0;
}

/** Nearest workable ore to the foreman, preferring the vein he is on. */
function nearestOre(g: Game, maxD = 7, maxDepth = Infinity): { x: number; y: number } | null {
  const w = g.world;
  const f = g.state.foreman;
  let best: { x: number; y: number } | null = null;
  let bd = Infinity;
  for (let y = Math.max(0, f.y - maxD); y <= Math.min(w.h - 1, f.y + maxD); y++)
    for (let x = Math.max(1, f.x - maxD); x <= Math.min(w.w - 2, f.x + maxD); x++) {
      const m = w.get(x, y);
      if (!MATERIALS[m]?.isOre || !canDig(m, g.state.pickTier) || g.world.depth(y) > maxDepth) continue;
      if (g.state.miners.some((mn) => mn.target?.x === x && mn.target.y === y)) continue;
      const d = Math.abs(x - f.x) + Math.abs(y - f.y) + (workable(g, x, y) ? 0 : 3);
      if (d < bd) {
        bd = d;
        best = { x, y };
      }
    }
  return best;
}

/** A path from the shaft to the next unfound verse, if the shaft is already that deep. */
function verseTunnel(g: Game): { x: number; y: number }[] | null {
  const s = g.state;
  const floor = shaftFloor(g);
  for (const c of g.world.carvings) {
    if (s.verses.run[c.verse] || c.verse > lastVerse(s)) continue;
    // the Geode verses sit in crystal: no use tunnelling to them without an aquamarine pick
    if (c.verse >= 8 && s.pickTier < 5) return null;
    if (c.y >= floor) return null;
    const dir = Math.sign(c.x - SHAFT_X);
    const path: { x: number; y: number }[] = [];
    for (let x = SHAFT_X + dir; x !== c.x; x += dir)
      if (isMineable(g.world.get(x, c.y))) path.push({ x, y: c.y });
    return path.length ? path : null;
  }
  return null;
}

function nearObj(g: Game, kind: string, x: number, y: number, r: number): boolean {
  return Object.entries(g.state.world.objects).some(([k, o]) => {
    const i = Number(k);
    return o === kind && Math.abs((i % g.world.w) - x) + Math.abs(Math.floor(i / g.world.w) - y) <= r;
  });
}

/** The deepest tile the foreman can dig right now, nearest the shaft. */
function deepestDiggable(g: Game, maxDepth = Infinity): { x: number; y: number } | null {
  reach(g);
  for (
    let y = Math.min(g.world.h - 1, g.reachMaxY + 1, g.world.surf[SHAFT_X]! + maxDepth);
    y > g.world.surf[SHAFT_X]!;
    y--
  ) {
    let best: { x: number; y: number } | null = null;
    for (let x = 1; x < g.world.w - 1; x++)
      if (canDig(g.world.get(x, y), g.state.pickTier) && workable(g, x, y))
        if (!best || Math.abs(x - SHAFT_X) < Math.abs(best.x - SHAFT_X)) best = { x, y };
    if (best) return best;
  }
  return null;
}

/** The next unfound verse is still below the shaft floor. */
function nextVerseBelow(g: Game, upTo: number): boolean {
  const floor = shaftFloor(g);
  const c = g.world.carvings.find((c) => !g.state.verses.run[c.verse]);
  return !!c && c.verse <= upTo && c.y >= floor;
}

function placeTorches(g: Game): void {
  const s = g.state;
  const r = reach(g);
  for (const m of s.miners) {
    if (!m.target) continue;
    if (lightFactor(g.world.faceLight(m.target.x, m.target.y)) >= 1) continue;
    const deep = g.world.depth(m.y) >= GLOWROOT.d0 - 2;
    // below 150 ft torches gutter: hang a lantern when there is one
    const tool = deep && s.res.lantern.gte(1) ? 'lantern' : s.res.torch.gte(1) ? 'torch' : null;
    if (!tool) continue;
    if (nearObj(g, 'torch', m.x, m.y, tool === 'torch' ? 4 : 2) || nearObj(g, 'lantern', m.x, m.y, 6))
      continue;
    for (const [dx, dy] of NEIGH4) {
      const x = m.x + dx;
      const y = m.y + dy;
      if (
        g.world.inside(x, y) &&
        r[y * g.world.w + x] &&
        !s.world.objects[String(g.world.idx(x, y))] &&
        y > g.world.surf[x]!
      ) {
        apply(g, { type: 'tap', x, y, tool });
        break;
      }
    }
  }
  // light the foreman's own face below Topsoil (ADR-017)
  const f = s.foreman;
  if (
    f.target &&
    g.world.depth(f.target.y) >= GLOWROOT.d0 &&
    lightFactor(g.world.faceLight(f.target.x, f.target.y)) < 1
  ) {
    const tool = s.res.lantern.gte(1) ? 'lantern' : s.res.torch.gte(1) ? 'torch' : null;
    if (tool && !nearObj(g, 'lantern', f.x, f.y, 5) && !nearObj(g, 'torch', f.x, f.y, 1))
      apply(g, { type: 'tap', x: f.x, y: f.y, tool });
  }
  // a support by the foreman once he is below Topsoil and has one to spare
  if (s.res.support.gte(1) && g.world.depth(f.y) >= GLOWROOT.d0 && !nearObj(g, 'support', f.x, f.y, 4))
    apply(g, { type: 'tap', x: f.x, y: f.y, tool: 'support' });
  for (const pest of [...s.pests]) apply(g, { type: 'tap', x: pest.x, y: pest.y, tool: 'dig' });
}

/** Echo upgrades, cheapest first. */
function spendEchoes(g: Game): void {
  const s = g.state;
  for (;;) {
    const u = UPGRADES.filter((u) => !s.upgrades[u.id] && (!u.requires || s.upgrades[u.requires])).sort(
      (a, b) => a.cost - b.cost,
    )[0];
    if (!u || s.echoes.lt(u.cost)) return;
    apply(g, { type: 'buyUpgrade', id: u.id });
  }
}

/** Act I shopping. */
function shop(g: Game): void {
  const s = g.state;
  const mc = minerCost(s).amount;
  const pick = nextPick(s);
  if (s.miners.length === 0) {
    if (s.res.copperBar.gte(mc)) apply(g, { type: 'hireMiner' });
  } else if (s.pickTier === 0) {
    if (pick && canPay(s, pick)) apply(g, { type: 'buyPick' });
  } else {
    if (s.res.copperBar.gte(mc) && s.miners.length < 10) apply(g, { type: 'hireMiner' });
    const haul = nextHaul(s);
    if (haul && s.miners.length >= 3 && canPay(s, haul)) apply(g, { type: 'buyHaul' });
    if (s.pickTier === 1) {
      const spare = s.miners.length >= 4 && s.res.copperBar.gte(mc.mul(0.5).add(2)) && s.res.tinBar.gte(1);
      apply(g, { type: 'setRecipe', recipe: spare ? 'bronze' : 'auto' });
      if (pick && canPay(s, pick)) apply(g, { type: 'buyPick' });
    } else apply(g, { type: 'setRecipe', recipe: 'auto' });
  }
  if (s.miners.length > 0 && s.res.torch.lt(2) && s.res.copperBar.gte(1)) apply(g, { type: 'craftTorches' });
}

/** Act II crafts: lanterns and supports to place. */
function shopAct2(g: Game): void {
  const s = g.state;
  if (s.buildings.lampworks > 0 && s.res.lantern.lt(2) && s.res.lumen.gte(30) && canCraft(s, 'lantern'))
    apply(g, { type: 'craft', id: 'lantern' });
  if (s.buildings.kiln > 0 && s.res.support.lt(1) && canCraft(s, 'support'))
    apply(g, { type: 'craft', id: 'support' });
}

/**
 * Act II foreman: gather ore until the village has an iron pick and a Lamp-works, then open the
 * shrines and finish the Glowroot. Leaves the foreman idle (for verse tunnels) when it has nothing.
 */
function act2Foreman(g: Game): void {
  const s = g.state;
  const f = s.foreman;
  const dig = (ore: { x: number; y: number } | null): boolean => {
    if (!ore) return false;
    apply(g, {
      type: 'digPath',
      tiles: line4({ x: f.x, y: f.y }, ore).filter((t) => canDig(g.world.get(t.x, t.y), s.pickTier)),
    });
    return !foremanIdle(g);
  };
  const geared = s.pickTier >= 3 && s.buildings.lampworks > 0;
  // the Cave-in needs Verses I and II; the shrines need an iron pick
  const next = g.world.carvings.find((c) => !s.verses.run[c.verse]);
  if (next && (next.verse <= 1 || s.pickTier >= (next.verse >= 8 ? 5 : 3))) {
    const tn = verseTunnel(g);
    if (tn) {
      apply(g, { type: 'digPath', tiles: tn });
      if (!foremanIdle(g)) return;
    }
  }
  if (!geared) {
    if (dig(nearestOre(g, 10))) return;
    // no ore in sight: open more of the mine, but not past where the haul can keep up
    const t = deepestDiggable(g, s.pickTier >= 2 ? GLOWROOT.d1 - 1 : 75);
    if (t) apply(g, { type: 'dig', x: t.x, y: t.y });
    return;
  }
  // Act III: below 400 ft the water decides. Without a pump to set, go get silver for one
  if (inAct3(s) && s.stats.maxDepthD >= GLOWROOT.d1) {
    const needSilver = s.res.pump.lt(1) || s.pickTier < 4 || (s.pickTier < 5 && s.res.aquamarine.lt(30));
    if (needSilver && dig(nearestOre(g, 14))) return;
  }
  if (s.stats.maxDepthD < goalD(s)) {
    const t = deepestDiggable(g);
    if (t) apply(g, { type: 'dig', x: t.x, y: t.y });
  } else dig(nearestOre(g, 10));
}

/** Act II shopping order: one goal at a time, saving for it, the way a player with a plan would. */
function shopA2(g: Game): void {
  const s = g.state;
  type Goal = { done: boolean; buy: () => void; cost: { res: ResKey; amount: Decimal }[] | null };
  const miner = (n: number): Goal => {
    const c = minerCost(s);
    return {
      done: s.miners.length >= n,
      buy: () => apply(g, { type: 'hireMiner' }),
      cost: [{ res: c.res, amount: c.amount }],
    };
  };
  const pick = (tier: number): Goal => ({
    done: s.pickTier >= tier,
    buy: () => apply(g, { type: 'buyPick' }),
    cost: nextPick(s),
  });
  const haul = (tier: number): Goal => ({
    done: s.haulTier >= tier,
    buy: () => apply(g, { type: 'buyHaul' }),
    cost: nextHaul(s),
  });
  const building = (id: 'lampworks' | 'kiln' | 'songloom', n: number): Goal => ({
    done: s.buildings[id] >= n || !buildingOffered(s, id),
    buy: () => apply(g, { type: 'buyBuilding', id }),
    cost: buildingCost(s, id),
  });
  const goals: (() => Goal)[] = [
    () => miner(1),
    () => pick(1),
    () => miner(3),
    () => haul(1),
    () => pick(2),
    () => miner(5),
    () => building('lampworks', 1),
    () => pick(3),
    // in the Halls the winch can't keep up: rails before anything else
    ...(inAct3(s) ? [() => haul(2)] : []),
    () => building('kiln', 1),
    () => haul(2),
    () => miner(8),
    () => building('lampworks', 2),
    () => miner(12),
    ...(ACT3
      ? [
          () => pick(4),
          () => haul(3),
          () => miner(16),
          () => building('songloom', 1),
          () => pick(5),
          () => building('lampworks', 3),
          () => miner(20),
          () => building('songloom', 2),
        ]
      : []),
  ];
  // work down the list; a goal waiting on one resource does not hold up goals paid in another
  const blocked = new Set<ResKey>();
  let goal: Goal | null = null;
  for (const mk of goals) {
    const gl = mk();
    if (gl.done || !gl.cost) continue;
    goal ??= gl;
    if (gl.cost.some((c) => blocked.has(c.res))) continue;
    if (canPay(s, gl.cost)) gl.buy();
    else for (const c of gl.cost) blocked.add(c.res);
  }
  // the bronze pick is the goal once the first miners and the winch are in
  const savingBronze = s.pickTier === 1 && s.miners.length >= 3 && s.haulTier >= 1;
  apply(g, {
    type: 'setRecipe',
    recipe:
      savingBronze && s.res.bronzeBar.lt(25) && s.res.tinBar.gte(1) && s.res.copperBar.gte(2)
        ? 'bronze'
        : 'auto',
  });
  shopAct2(g);
  if (ACT3) shopAct3(g);
  if (s.miners.length > 0 && s.res.torch.lt(2) && s.res.copperBar.gte(3)) apply(g, { type: 'craftTorches' });
}

/** Act III: keep a pump or two in hand, weave every charm the loom allows and wear the best. */
function shopAct3(g: Game): void {
  const s = g.state;
  if (s.stats.firsts.halls !== undefined && s.res.pump.lt(2) && canCraft(s, 'pump'))
    apply(g, { type: 'craft', id: 'pump' });
  for (const c of CHARMS)
    if (canWeave(s, c.id) && canPay(s, weaveCost(s))) apply(g, { type: 'weave', id: c.id });
}

/** Pumps: set one by any water near the bottom of the mine; take up the ones that have run dry. */
function managePumps(g: Game): void {
  const s = g.state;
  const w = g.world;
  const r = reach(g);
  const wetNear = (px: number, py: number): boolean => {
    for (let y = py - PUMP.radius; y <= py + PUMP.radius; y++)
      for (let x = px - PUMP.radius; x <= px + PUMP.radius; x++)
        if ((x - px) ** 2 + (y - py) ** 2 <= PUMP.radius ** 2 && flooded(g, x, y)) return true;
    return false;
  };
  for (const [k, o] of Object.entries(s.world.objects)) {
    if (o !== 'pump') continue;
    const i = Number(k);
    const x = i % w.w;
    const y = (i - x) / w.w;
    if (!wetNear(x, y)) apply(g, { type: 'tap', x, y, tool: 'pump' });
  }
  if (s.res.pump.lt(1)) return;
  // the deepest dry tile with water in reach of a pump, nearest the shaft
  for (let y = g.reachMaxY; y > g.reachMaxY - 8 && y > 0; y--) {
    const xs = Array.from({ length: w.w - 2 }, (_, k) => k + 1).sort(
      (a, b) => Math.abs(a - SHAFT_X) - Math.abs(b - SHAFT_X),
    );
    for (const x of xs) {
      const i = y * w.w + x;
      if (!r[i] || s.world.objects[String(i)] || nearObj(g, 'pump', x, y, 3) || !wetNear(x, y)) continue;
      apply(g, { type: 'tap', x, y, tool: 'pump' });
      return;
    }
  }
}

/** Act II bot: how long without a new depth before it lets the mountain cave in. */
const STALL_MS = Number(args.stall ?? 10) * 60_000;

function playOne(seed: number): Record<string, number> & { echoes: number } {
  const g = createGame(seed);
  const s = g.state;
  let deepest = 0;
  let lastDeeper = 0;
  let first1: Record<string, number> | null = null;
  const act2: {
    glowroot?: number;
    verse4?: number;
    ft400?: number;
    act3?: number;
    ft1000?: number;
    caveIns: number[];
  } = { caveIns: [] };
  const limit = MINUTES * 60 * 1000;
  for (let t = 0; t < limit; t += TICK_MS) {
    if (t % ATTENTION_MS === 0) {
      const act2Mode = ACT2 && (s.cycle > 1 || s.verses.run[1] === true);
      if (act2Mode && foremanIdle(g)) {
        act2Foreman(g);
        const tunnel = foremanIdle(g) ? verseTunnel(g) : null;
        if (tunnel) apply(g, { type: 'digPath', tiles: tunnel });
      } else if (foremanIdle(g)) {
        const tunnel = verseTunnel(g);
        const needCopper =
          s.miners.length < 2 ||
          s.pickTier < 1 ||
          s.res.copperBar.lt(minerCost(s).amount.div(2)) ||
          (ACT2 && s.buildings.lampworks === 0 && buildingOffered(s, 'lampworks'));
        // an engaged player heads for the next verse once the village has its first pick
        const chasing = s.pickTier >= 1 && nextVerseBelow(g, 1);
        const ore = !tunnel && needCopper && !chasing ? nearestOre(g, 5) : null;
        if (tunnel) apply(g, { type: 'digPath', tiles: tunnel });
        else if (ore) {
          const f = g.state.foreman;
          const tiles = line4({ x: f.x, y: f.y }, ore).filter((t) => isMineable(g.world.get(t.x, t.y)));
          apply(g, { type: 'digPath', tiles });
        }
        // nothing took (an ore the foreman cannot get at from here): deepen the shaft instead
        if (foremanIdle(g)) apply(g, { type: 'dig', x: SHAFT_X, y: shaftFloor(g) });
        // the floor is too hard for this pick: go down beside it
        if (foremanIdle(g)) {
          const t2 = deepestDiggable(g);
          if (t2) apply(g, { type: 'dig', x: t2.x, y: t2.y });
        }
      }
      if (act2Mode) shopA2(g);
      else shop(g);
      placeTorches(g);
      if (ACT3) managePumps(g);
      s.story.events.length = 0;
      if (args.trace && t % 600000 === 0)
        console.log(
          `${t / 60000} min · cycle ${s.cycle} · depth ${s.stats.maxDepthD} · shaft ${shaftFloor(g) - g.world.surf[SHAFT_X]!} · haul ${s.haulTier} · ugCu ${s.underground.copperOre} ugSn ${s.underground.tinOre} · CuOre ${s.res.copperOre} · Sn ${s.res.tinBar} · torches placed ${Object.values(s.world.objects).filter((o) => o === 'torch').length} · faces ${s.miners.map((m) => (m.target ? g.world.get(m.target.x, m.target.y) + '@' + g.world.depth(m.target.y) : '-')).join('/')} · miners ${s.miners.length} · pick ${s.pickTier} · Cu ${s.res.copperBar} · Fe ${s.res.ironBar} · spores ${s.res.spores} · Lumen ${s.res.lumen.toFixed(1)} · lanterns ${s.res.lantern}${ACT3 ? ` · Ag ore ${s.res.silverOre}+${s.underground.silverOre} bars ${s.res.silverBar} · pumps ${s.res.pump}/${Object.values(s.world.objects).filter((o) => o === 'pump').length} · F ${s.foreman.x},${g.world.depth(s.foreman.y)} q${s.foreman.queue.length} · reachMax ${g.world.depth(g.reachMaxY)}` : ''}`,
        );
      if (canCaveIn(s) && args.until === 'first-cavein') break;
      if (ACT2) {
        if (s.stats.maxDepthD > deepest) {
          deepest = s.stats.maxDepthD;
          lastDeeper = s.t;
        }
        const glowDone =
          s.stats.maxDepthD >= GLOWROOT.d1 && s.verses.known[2] && s.verses.known[3] && s.verses.known[4];
        if (glowDone && act2.glowroot === undefined) act2.glowroot = s.totalT;
        if (s.verses.known[4] && act2.verse4 === undefined) act2.verse4 = s.totalT;
        if (s.stats.maxDepthD >= GLOWROOT.d1 && act2.ft400 === undefined) act2.ft400 = s.totalT;
        const act3Done = s.stats.maxDepthD >= GEODES.d1 && s.verses.known.slice(5, 10).every(Boolean);
        if (s.stats.maxDepthD >= GEODES.d1 && act2.ft1000 === undefined) act2.ft1000 = s.totalT;
        if (act3Done && act2.act3 === undefined) act2.act3 = s.totalT;
        if (ACT3 ? act3Done : glowDone) break;
        // Cave in once the dig has stalled for a while
        if (canCaveIn(s) && s.t - lastDeeper > (inAct3(s) ? 3 : 1) * STALL_MS) {
          if (act2.caveIns.length === 0) first1 = { ...s.stats.firsts, echoes: echoGain(s).toNumber() };
          act2.caveIns.push(Math.round(s.totalT / 60000));
          apply(g, { type: 'caveIn' });
          deepest = 0;
          lastDeeper = 0;
          spendEchoes(g);
        }
      }
    }
    step(g, TICK_MS);
    g.events.length = 0;
  }
  if (args.debug)
    console.log(
      seed,
      'cu',
      s.res.copperBar.toString(),
      'cuOre',
      s.res.copperOre.toString(),
      'ug',
      s.underground.copperOre.toString(),
      'torch',
      s.res.torch.toString(),
      'pick',
      s.pickTier,
      'bronze',
      s.res.bronzeBar.toString(),
      'tin',
      s.res.tinBar.toString(),
      'torches placed',
      Object.values(s.world.objects).filter((o) => o === 'torch').length,
    );
  if (ACT2)
    console.log(
      `seed ${seed}: cave-ins at ${act2.caveIns.join(', ')} min · 400 ft ${mins(act2.ft400)} · Verse V ${mins(act2.verse4)} · cleared ${mins(act2.glowroot)}${ACT3 ? ` · 1000 ft ${mins(act2.ft1000)} · Act III ${mins(act2.act3)} · verses ${s.verses.known.map((k) => (k ? 1 : 0)).join('')} · charms ${s.charms.equipped.join('+')} · pumps ${s.stats.firsts.pumped !== undefined ? 'used' : 'none'}` : ''} · echoes ever ${s.echoesEver.toString()} · pick ${s.pickTier} · lampworks ${s.buildings.lampworks} · collapses ${s.stats.collapses}`,
    );
  return {
    ...(first1 ?? s.stats.firsts),
    echoes: first1?.echoes ?? echoGain(s).toNumber(),
    depth: s.stats.maxDepthD * 4,
    miners: s.miners.length,
    ...(act2.glowroot !== undefined ? { glowroot: act2.glowroot } : {}),
    ...(act2.act3 !== undefined ? { act3: act2.act3 } : {}),
  };
}

const runs = Array.from({ length: SEEDS }, (_, i) => playOne(Number(args.seed0 ?? 1000) + i * 7919));
const median = (xs: number[]): number => {
  const a = [...xs].sort((p, q) => p - q);
  return a.length ? a[Math.floor(a.length / 2)]! : NaN;
};

console.log(`Undersong balance sim · ${SEEDS} seeds · up to ${MINUTES} min\n`);
console.log('Milestone                    target   median   per seed');
let ok = true;
for (const [k, name, target, atMost] of TARGETS) {
  const vals = runs.map((r) => r[k]).filter((v): v is number => v !== undefined);
  const med = vals.length === runs.length ? median(vals) / 60000 : NaN;
  const within = atMost ? med <= target : Math.abs(med - target) <= target * 0.15;
  if (!within) ok = false;
  console.log(
    `${name.padEnd(28)} ${((atMost ? '≤' : '') + target).padStart(5)}m  ${Number.isNaN(med) ? '  never' : med.toFixed(1).padStart(6) + 'm'}  ${runs.map((r) => mins(r[k])).join(' ')} ${within ? '✓' : '✗'}`,
  );
}
const ech = median(runs.map((r) => r.echoes));
if (!ACT2)
  console.log(
    `${'Echoes at first Cave-in'.padEnd(28)}  6–10   ${String(ech).padStart(6)}   ${runs.map((r) => String(r.echoes).padStart(5)).join(' ')} ${ech >= 6 && ech <= 10 ? '✓' : '✗'}`,
  );
console.log(
  `\nDepth reached (ft): ${runs.map((r) => r.depth).join(', ')} · miners: ${runs.map((r) => r.miners).join(', ')}`,
);
console.log(ok ? '\nAll pacing targets within ±15%.' : '\nSome pacing targets are outside ±15%.');

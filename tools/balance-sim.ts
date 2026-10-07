// Headless balance sim: a bot plays like an engaged player and reports time to each canon §5 milestone.
// Usage: npm run sim -- [--seeds=5] [--until=first-cavein] [--minutes=90] [--strict]
import type { GameState } from '../src/sim/state';
import { TICK_MS, SHAFT_X } from '../src/data/constants';
import { MATERIALS, canDig, isMineable } from '../src/data/materials';
import { lightFactor } from '../src/data/light';
import { apply } from '../src/sim/actions';
import { canCaveIn, echoGain } from '../src/sim/cavein';
import {
  minerCost,
  metalworkCost,
  metalworkOffered,
  nextHaul,
  nextPick,
  canPay,
  whetstoneCost,
} from '../src/sim/economy';
import { METALWORK } from '../src/data/economy';
import { buildingCost, buildingOffered, canCraft } from '../src/sim/village';
import { UPGRADES } from '../src/data/upgrades';
import { BIOMES, biomeAt } from '../src/data/biomes';
import { createGame, loadGame, type Game } from '../src/sim/game';
import { shaftFloor } from '../src/sim/miners';
import { reach, workable } from '../src/sim/reach';
import { step } from '../src/sim/step';
import { NEIGH4 } from '../src/world/world';
import type { ResKey } from '../src/data/resources';
import type { Decimal } from '../src/sim/decimal';
import { line4 } from '../src/sim/geom';
import { readFileSync, writeFileSync } from 'node:fs';
import { pack, unpack } from '../src/save/codec';
import { CHARMS } from '../src/data/charms';
import { PUMP } from '../src/data/water';
import { canWeave, weaveCost } from '../src/sim/charms';
import { flooded } from '../src/sim/water';
import { echoAffordable, surfaceAffordable, villageAffordable } from '../src/ui/feedback';
import { helperCost, helperOffered } from '../src/sim/helpers';
import { heatAt } from '../src/sim/heat';
import { HEAT } from '../src/data/heat';
import { endingReady } from '../src/sim/ending';
import { HEART_CENTER_D } from '../src/world/generator';
import {
  feastNeed,
  feasting,
  isElder,
  mealCost,
  plotCost,
  pumpsPlaced,
  saplingCost,
  cellarCost,
  paddyCost,
  hotbedCost,
  treeStage,
  woodCost,
} from '../src/sim/surface';
import { MEALS, WOODLOT, WOOD_BUYS } from '../src/data/surface';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);
const SEEDS = Number(args.seeds ?? 9);
/** How often the bot looks at the screen, in ms. An engaged player, not a perfect one. */
const ATTENTION_MS = Number(args.attention ?? 1500);
/** M6: an engaged player looks up at the fields about this often (ms); --surface=off leaves the surface alone. */
const SURFACE_MS = Number(args['surface-every'] ?? 30_000);
const SURFACE = args.surface !== 'off';
const MINUTES = Number(args.minutes ?? 120);
/** Ending mode plays on through the Ember Deep to the Hollow Heart, and sings the last verse. */
const ENDING = args.until === 'ending';
/** Act III mode plays on through the Flooded Halls and the Singing Geodes. */
const ACT3 = args.until === 'act3' || ENDING;
/** Act II mode plays on through Cave-ins until Glowroot is cleared (and on through Act III with --until=act3). */
const ACT2 = args.until === 'act2' || ACT3;
const GLOWROOT = BIOMES[2]!;
const GEODES = BIOMES[4]!;
const EMBER = BIOMES[5]!;
/** Act II is behind the village once 400 ft has been reached and the Glowroot verses are known. */
const glowrootKnown = (s: Game['state']): boolean =>
  s.verses.known[2] === true && s.verses.known[3] === true && s.verses.known[4] === true;
/** In Act III mode the bot only moves on to the Halls once the Glowroot is behind it, as a player would. */
const inAct3 = (s: Game['state']): boolean => ACT3 && glowrootKnown(s) && s.stats.bestDepthD >= GLOWROOT.d1;
/** In ending mode the bot moves on to the Ember Deep once Act III is behind it. */
const inAct4 = (s: Game['state']): boolean =>
  ENDING && inAct3(s) && s.verses.known.slice(5, 10).every(Boolean) && s.stats.bestDepthD >= GEODES.d1;
/** The depth the late-game bot digs for: in Act IV, the Heartstone mound where Verse XII is. */
const goalD = (s: Game['state']): number =>
  inAct4(s) ? HEART_CENTER_D + 9 : inAct3(s) ? GEODES.d1 : GLOWROOT.d1;
/** Highest verse (0-based) the bot goes after. */
const lastVerse = (s: Game['state']): number => (inAct4(s) ? 11 : inAct3(s) ? 9 : 4);

// canon §5 (ADR-015). A target with `atMost` passes when the median is at or under it.
const TARGETS: [string, string, number, boolean?][] = ENDING
  ? [
      ['act3', 'Act III end', 390],
      ['ending', 'Ending reached', 690],
    ]
  : ACT3
    ? [
        ['glowroot', 'Glowroot cleared (Act II)', 170],
        ['act3', 'Act III end', 390],
      ]
    : ACT2
      ? [['glowroot', 'Glowroot cleared (Act II)', 170]]
      : [
          ['bar', 'First bar smelted', 1, true],
          ['miner', 'First miner hired', 8],
          ['verse0', 'Verse I found', 10],
          ['ft150', '150 ft', 17],
          ['caveInReady', 'First Cave-in available', 30],
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
    // Verse XI is ringed with ember ore (crystal pick); Verse XII sits in heartstone (Heart pick)
    if (c.verse === 10 && s.pickTier < 6) return null;
    if (c.verse === 11 && s.pickTier < 8) return null;
    if (c.y >= floor) {
      // below the shaft: in Act III the mine is deeper than the shaft, so cut across from where the foreman stands
      if (!inAct3(s) || c.y > g.reachMaxY + 2) return null;
      // a hot verse wants a vent beside the Foreman first
      if (inAct4(s)) ventFace(g, c.x, c.y);
      const f = s.foreman;
      // aim for rock beside the carving: opening it is what finds the verse (it may stand in open air)
      const beside = NEIGH4.map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy })).filter((t) =>
        canDig(g.world.get(t.x, t.y), s.pickTier),
      );
      const near = beside.find((t) => workable(g, t.x, t.y));
      if (near) return [near];
      const aim = beside[0] ?? { x: c.x + Math.sign(f.x - c.x || 1), y: c.y };
      const tiles = line4({ x: f.x, y: f.y }, aim).filter((t) => canDig(g.world.get(t.x, t.y), s.pickTier));
      // nothing beside it is open yet: open the rock next to that, from wherever the mine already reaches
      if (tiles.length && !workable(g, tiles[0]!.x, tiles[0]!.y)) {
        const w2 = beside
          .flatMap((t) => NEIGH4.map(([dx, dy]) => ({ x: t.x + dx, y: t.y + dy })))
          .find((t) => canDig(g.world.get(t.x, t.y), s.pickTier) && workable(g, t.x, t.y));
        if (w2) return [w2];
      }
      return tiles.length ? tiles : null;
    }
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

/** Helpers (ADR-020): an engaged player hires each one soon after its chore turns up. */
function hireHelpers(g: Game): void {
  const s = g.state;
  for (const id of ['lamps', 'pell', 'dog', 'props', 'pumps', 'vents', 'tansy', 'rook'] as const) {
    const c = helperCost(s, id);
    if (!c || !helperOffered(s, id) || (s.helpers[id] ?? 0) > 0) continue;
    if (id !== 'props' && id !== 'pumps' && id !== 'vents' && s.miners.length < 3) continue;
    if (canPay(s, c)) apply(g, { type: 'hireHelper', id });
  }
}

/**
 * M6 Holloway above: every so often the player looks up, reaps and fells by hand until the helpers take over,
 * rings the bell, and spends barley and timber. Copper goes on plots and saplings only when it is spare.
 */
const tendedAt = new WeakMap<Game, number>();
function tendSurface(g: Game): void {
  const s = g.state;
  const sf = s.surface;
  if (!SURFACE || !sf.tansy || s.totalT < (tendedAt.get(g) ?? 0)) return;
  tendedAt.set(g, s.totalT + SURFACE_MS);
  if (!s.helpers.tansy) sf.plots.forEach((p, i) => p.t >= 1 && apply(g, { type: 'harvest', plot: i }));
  if (!feasting(s) && sf.feast >= feastNeed(s)) apply(g, { type: 'ringFeast' });
  if (s.helpers.tansy) apply(g, { type: 'autoFeast', on: true });
  const spare = (c: { res: ResKey; amount: Decimal }[] | null): boolean =>
    !!c && canPay(s, c) && c[0]!.amount.lte(s.res.copperBar.mul(0.1)) && s.miners.length >= 2;
  // M12-04: plots are cheap and the bell needs a field of them, so take one whenever it is half the copper in hand
  const plot = plotCost(s);
  if (plot && canPay(s, plot) && plot[0]!.amount.lte(s.res.copperBar.mul(0.5)) && s.miners.length >= 2)
    apply(g, { type: 'buyPlot' });
  // act crops (M6-07): the cellar, paddies and hot-beds, each from a quarter of what is in hand
  const spareAny = (c: { res: ResKey; amount: Decimal }[] | null): boolean =>
    !!c && c.every((x) => s.res[x.res].mul(0.25).gte(x.amount));
  if (spareAny(cellarCost(s))) apply(g, { type: 'workCellar' });
  // never turn over the last few barley plots: barley feeds the bell and the meals
  const barley = sf.plots.filter((p) => !p.crop).length;
  if (barley > 2 && spareAny(paddyCost(s))) apply(g, { type: 'plantCrop', crop: 'cress' });
  if (barley > 2 && spareAny(hotbedCost(s))) apply(g, { type: 'plantCrop', crop: 'pepper' });
  for (const m of [...MEALS].sort((a, b) => sf.meals[a.id] - sf.meals[b.id]))
    if (canPay(s, mealCost(s, m.id) ?? [{ res: 'barley', amount: s.res.barley.add(1) }]))
      apply(g, { type: 'eatMeal', id: m.id });
  if (!sf.rook) return;
  sf.trees.forEach((t, i) => {
    if (!s.helpers.rook && !isElder(t) && t.stood === 0 && treeStage(t) >= WOODLOT.stageS.length)
      apply(g, { type: 'chop', tree: i });
  });
  if (spare(saplingCost(s))) apply(g, { type: 'plantSapling' });
  // keep a few timber for pit props; spend the rest on the cheaper of hearth and cottage
  const price = (id: (typeof WOOD_BUYS)[number]['id']): number =>
    woodCost(s, id)?.[0]!.amount.toNumber() ?? Infinity;
  for (const b of [...WOOD_BUYS].sort((a, c) => price(a.id) - price(c.id)))
    if (s.res.timber.gte(price(b.id) + 6)) apply(g, { type: 'buyWood', id: b.id });
}

/** M12-04: what the bot touched over the whole session, across Cave-ins, for the systems the sims must cover. */
interface Coverage {
  pumps: number;
  paddies: number;
  hotbeds: number;
  plots: number;
  feasts: number;
  lastFeasts: number;
  bell: number;
  bellNeed: number;
  crops: number;
}
const newCoverage = (): Coverage => ({
  pumps: 0,
  paddies: 0,
  hotbeds: 0,
  plots: 0,
  feasts: 0,
  lastFeasts: 0,
  bell: 0,
  bellNeed: 0,
  crops: 0,
});
function trackCoverage(s: GameState, c: Coverage): void {
  const sf = s.surface;
  c.pumps = Math.max(c.pumps, pumpsPlaced(s));
  c.paddies = Math.max(c.paddies, sf.plots.filter((p) => p.crop === 'cress').length);
  c.hotbeds = Math.max(c.hotbeds, sf.plots.filter((p) => p.crop === 'pepper').length);
  c.plots = Math.max(c.plots, sf.plots.length);
  // the bell's count resets with a Cave-in, so count rings as they happen
  if (sf.feasts > c.lastFeasts) c.feasts += sf.feasts - c.lastFeasts;
  c.lastFeasts = sf.feasts;
  if (sf.feast >= c.bell) {
    c.bell = sf.feast;
    c.bellNeed = feastNeed(s);
  }
}
const coverageLine = (c: Coverage): string =>
  `coverage: plots max ${c.plots} · pumps max ${c.pumps} · paddies max ${c.paddies} · hot-beds max ${c.hotbeds} · feasts rung ${c.feasts} · bell best ${c.bell}/${c.bellNeed}`;

/** The whetstone: an engaged player takes the cheap levels at once, later ones from spare copper. */
function sharpen(g: Game): void {
  const s = g.state;
  for (;;) {
    const c = whetstoneCost(s)[0]!.amount;
    if (s.res.copperBar.lt(c) || (s.whetstone >= 2 && c.gt(s.res.copperBar.mul(0.2)))) return;
    apply(g, { type: 'whetstone' });
  }
}

/** M9-02: the deep metals' repeatable buys, from spare metal only (a fifth of what is in hand). */
function polish(g: Game): void {
  const s = g.state;
  // M10-01: the bot takes the tinker's first offer
  if (s.cart.offers) apply(g, { type: 'cart', i: 0 });
  for (const m of METALWORK) {
    for (;;) {
      if (!metalworkOffered(s, m.id)) break;
      const c = metalworkCost(s, m.id)[0]!.amount;
      if (s.res[m.res].lt(c) || c.gt(s.res[m.res].mul(0.2))) break;
      apply(g, { type: 'metalwork', id: m.id });
    }
  }
}

/** Act I shopping. */
function shop(g: Game): void {
  const s = g.state;
  hireHelpers(g);
  sharpen(g);
  const mc = minerCost(s).amount;
  const pick = nextPick(s);
  if (s.miners.length === 0) {
    if (s.res.copperBar.gte(mc)) apply(g, { type: 'hireMiner' });
  } else if (s.pickTier === 0) {
    if (pick && canPay(s, pick)) apply(g, { type: 'buyPick' });
  } else {
    if (s.res.copperBar.gte(mc) && s.miners.length < 10) apply(g, { type: 'hireMiner' });
    const haul = nextHaul(s);
    if (haul && (s.miners.length >= 3 || s.underground.copperOre.gte(15)) && canPay(s, haul))
      apply(g, { type: 'buyHaul' });
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
  // Act IV: gold and ember ore for the picks and the steam lift, then down to the Heart
  if (inAct4(s)) {
    const needOre = s.pickTier < 8 || s.haulTier < 4;
    if (needOre && dig(nearestOre(g, 14))) return;
  }
  // Act III: below 400 ft the water decides. Without a pump to set, go get silver for one
  else if (inAct3(s) && s.stats.maxDepthD >= GLOWROOT.d1) {
    // short of the aquamarine pick (aquamarine or silver): keep mining ore until it is paid for
    const pick = nextPick(s);
    const needSilver = s.res.pump.lt(1) || s.pickTier < 4 || (s.pickTier < 5 && !!pick && !canPay(s, pick));
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
          // the Geode verses are what Act III is for: the picks that open them come first
          () => pick(4),
          () => pick(5),
          () => building('songloom', 1),
          () => haul(3),
          () => miner(16),
          () => building('lampworks', 3),
          () => miner(20),
          () => building('songloom', 2),
        ]
      : []),
    ...(ENDING && inAct4(s)
      ? [
          // the crystal pick opens basalt; gold buys the steam lift; the ember pick opens the Heart
          () => pick(6),
          () => haul(4),
          () => pick(7),
          () => pick(8),
          () => building('kiln', 2),
          () => miner(24),
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
  hireHelpers(g);
  if (s.miners.length > 0 && s.res.torch.lt(2) && s.res.copperBar.gte(3)) apply(g, { type: 'craftTorches' });
}

/** Act IV: a cooling vent beside the Foreman when the face he wants is too hot. */
function ventFace(g: Game, x: number, y: number): void {
  const s = g.state;
  if (heatAt(g, x, y) < HEAT.stopAt) return;
  if (s.res.vent.lt(1) && canCraft(s, 'vent')) apply(g, { type: 'craft', id: 'vent' });
  if (s.res.vent.lt(1) || nearObj(g, 'vent', s.foreman.x, s.foreman.y, 3)) return;
  apply(g, { type: 'tap', x: s.foreman.x, y: s.foreman.y, tool: 'vent' });
}

/** Act III: keep a pump or two in hand, weave every charm the loom allows and wear the best. */
function shopAct3(g: Game): void {
  const s = g.state;
  if (inAct4(s)) {
    const f = s.foreman;
    if (f.target) ventFace(g, f.target.x, f.target.y);
  }
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
  // --load=<path>: carry on from a saved game (one written with --save-act3), to tune Act IV quickly
  const g = args.load ? loadGame(unpack(readFileSync(args.load, 'utf8'))) : createGame(seed);
  const s = g.state;
  let deepest = 0;
  let lastDeeper = 0;
  let lastProgress = 0;
  let first1: Record<string, number> | null = null;
  let lastBuyable = 0;
  let gap = 0;
  let gapAt = 0;
  // M9-01: the longest wait with nothing to buy in each act, over the whole run, by the act the village has reached
  const actGap: Record<string, number> = {};
  let anyBuyable = 0;
  const act2: {
    glowroot?: number;
    verse4?: number;
    ft400?: number;
    act3?: number;
    ft1000?: number;
    ft1400?: number;
    ending?: number;
    caveIns: number[];
  } = { caveIns: [] };
  const limit = MINUTES * 60 * 1000;
  const cov = newCoverage();
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
      if (s.cycle === 1 && s.t <= 15 * 60_000) {
        if (villageAffordable(g) || surfaceAffordable(g)) lastBuyable = s.t;
        if (s.t - lastBuyable > gap) gapAt = lastBuyable;
        gap = Math.max(gap, s.t - lastBuyable);
      }
      if (villageAffordable(g) || surfaceAffordable(g) || echoAffordable(g)) anyBuyable = t;
      const act = biomeAt(s.stats.bestDepthD).act;
      actGap[act] = Math.max(actGap[act] ?? 0, t - anyBuyable);
      polish(g);
      if (act2Mode) shopA2(g);
      else shop(g);
      placeTorches(g);
      tendSurface(g);
      if (ACT3 && !s.helpers.pumps) managePumps(g);
      trackCoverage(s, cov);
      s.story.events.length = 0;
      if (args.trace && t % 600000 === 0)
        console.log(
          `${t / 60000} min · cycle ${s.cycle} · depth ${s.stats.maxDepthD} · shaft ${shaftFloor(g) - g.world.surf[SHAFT_X]!} · haul ${s.haulTier} · ugCu ${s.underground.copperOre} ugSn ${s.underground.tinOre} · CuOre ${s.res.copperOre} · Sn ${s.res.tinBar} · torches placed ${Object.values(s.world.objects).filter((o) => o === 'torch').length} · faces ${s.miners.map((m) => (m.target ? g.world.get(m.target.x, m.target.y) + '@' + g.world.depth(m.target.y) : '-')).join('/')} · miners ${s.miners.length} · pick ${s.pickTier} · Cu ${s.res.copperBar} · Fe ${s.res.ironBar} · spores ${s.res.spores} · Lumen ${s.res.lumen.toFixed(1)} · lanterns ${s.res.lantern}${ACT3 ? ` · Ag ore ${s.res.silverOre}+${s.underground.silverOre} bars ${s.res.silverBar}· aq ${s.res.aquamarine}+${s.underground.aquamarine ?? 0} loom ${s.buildings.songloom} cry ${s.res.crystal} · pumps ${s.res.pump}/${Object.values(s.world.objects).filter((o) => o === 'pump').length} · F ${s.foreman.x},${g.world.depth(s.foreman.y)} q${s.foreman.queue.length} · run ${s.verses.run.map((k) => (k ? 1 : 0)).join('')} · vents ${s.res.vent}/${Object.values(s.world.objects).filter((o) => o === 'vent').length} · Au ${s.res.goldBar} · reachMax ${g.world.depth(g.reachMaxY)}` : ''}`,
        );
      if (canCaveIn(s) && args.until === 'first-cavein') break;
      if (ACT2) {
        // a new pick, haul, building or verse counts as progress too: a player saving toward one doesn't give up
        const progress =
          s.stats.maxDepthD * 1000 +
          s.pickTier * 100 +
          s.haulTier * 10 +
          s.buildings.songloom +
          s.verses.run.filter(Boolean).length;
        if (s.stats.maxDepthD > deepest || progress > lastProgress) {
          deepest = Math.max(deepest, s.stats.maxDepthD);
          lastProgress = progress;
          lastDeeper = s.t;
        }
        const glowDone =
          s.stats.maxDepthD >= GLOWROOT.d1 && s.verses.known[2] && s.verses.known[3] && s.verses.known[4];
        if (glowDone && act2.glowroot === undefined) act2.glowroot = s.totalT;
        if (s.verses.known[4] && act2.verse4 === undefined) act2.verse4 = s.totalT;
        if (s.stats.maxDepthD >= GLOWROOT.d1 && act2.ft400 === undefined) act2.ft400 = s.totalT;
        // Act III is behind the village once 1000 ft has ever been reached and Verses VI to X are known, the same
        // test inAct4 uses: a Cave-in between the two doesn't undo either, for a player or the bot
        const act3Done = s.stats.bestDepthD >= GEODES.d1 && s.verses.known.slice(5, 10).every(Boolean);
        if (s.stats.maxDepthD >= GEODES.d1 && act2.ft1000 === undefined) act2.ft1000 = s.totalT;
        if (act3Done && act2.act3 === undefined) {
          act2.act3 = s.totalT;
          // --save-act3=<path>: keep the game at the end of Act III
          if (args['save-act3']) writeFileSync(args['save-act3'], pack(s));
        }
        if (s.stats.maxDepthD >= EMBER.d1 && act2.ft1400 === undefined) act2.ft1400 = s.totalT;
        if (ENDING && endingReady(s)) {
          act2.ending = s.totalT;
          apply(g, { type: 'chooseEnding', which: 'sing' });
          break;
        }
        if (!ENDING && (ACT3 ? act3Done : glowDone)) break;
        // Cave in once the dig has stalled for a while
        if (canCaveIn(s) && s.t - lastDeeper > (inAct4(s) ? 4 : inAct3(s) ? 3 : 1) * STALL_MS) {
          if (act2.caveIns.length === 0) first1 = { ...s.stats.firsts, echoes: echoGain(s).toNumber() };
          act2.caveIns.push(Math.round(s.totalT / 60000));
          apply(g, { type: 'caveIn' });
          deepest = 0;
          lastDeeper = 0;
          lastProgress = 0;
          spendEchoes(g);
        }
      }
    }
    // --save-at=<min> --save=<path>: write the game as it stands, for screenshots
    if (args.save && t === Number(args['save-at']) * 60_000) writeFileSync(args.save, pack(s));
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
      `seed ${seed}: cave-ins at ${act2.caveIns.join(', ')} min · 400 ft ${mins(act2.ft400)} · Verse V ${mins(act2.verse4)} · cleared ${mins(act2.glowroot)}${ACT3 ? ` · 1000 ft ${mins(act2.ft1000)} · Act III ${mins(act2.act3)} ${ENDING ? ` · 1400 ft ${mins(act2.ft1400)} · ending ${mins(act2.ending)}` : ''} · verses ${s.verses.known.map((k) => (k ? 1 : 0)).join('')} · charms ${s.charms.equipped.join('+')} · pumps ${s.stats.firsts.pumped !== undefined ? 'used' : 'none'}` : ''} · echoes ever ${s.echoesEver.toString()} · pick ${s.pickTier} · lampworks ${s.buildings.lampworks} · collapses ${s.stats.collapses} · surface bread ${s.surface.meals.bread} porridge ${s.surface.meals.porridge} hearth ${s.surface.wood.hearth} cottages ${s.surface.wood.cottage} feasts ${s.surface.feasts} plots ${s.surface.plots.length} trees ${s.surface.trees.map((t) => t.stood).join('/')} · ${coverageLine(cov)}`,
    );
  return {
    ...(first1 ?? s.stats.firsts),
    echoes: first1?.echoes ?? echoGain(s).toNumber(),
    depth: s.stats.maxDepthD * 4,
    gap,
    gapAt,
    ...Object.fromEntries(Object.entries(actGap).map(([a, v]) => [`wait${a}`, v])),
    miners: s.miners.length,
    ...(act2.glowroot !== undefined ? { glowroot: act2.glowroot } : {}),
    ...(act2.act3 !== undefined ? { act3: act2.act3 } : {}),
    ...(act2.ending !== undefined ? { ending: act2.ending } : {}),
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
  // ADR-035: arriving early is fine; only a milestone more than 15% late is a miss
  const within = atMost ? med <= target : med <= target * 1.15;
  if (!within) ok = false;
  console.log(
    `${name.padEnd(28)} ${((atMost ? '≤' : '') + target).padStart(5)}m  ${Number.isNaN(med) ? '  never' : med.toFixed(1).padStart(6) + 'm'}  ${runs.map((r) => mins(r[k])).join(' ')} ${within ? '✓' : '✗'}`,
  );
}
const ech = median(runs.map((r) => r.echoes));
// M8-01: the median longest wait with nothing to buy in the first 15 minutes must stay under this
const MAX_WAIT_S = 90;
const wait = median(runs.map((r) => r.gap ?? 0)) / 1000;
if (wait > MAX_WAIT_S) ok = false;
console.log(
  `${'Longest wait, nothing to buy'.padEnd(28)}  first 15 min · median ${wait.toFixed(0)} s (≤${MAX_WAIT_S}) · ${runs.map((r) => ((r.gap ?? 0) / 1000).toFixed(0) + 's@' + ((r.gapAt ?? 0) / 60000).toFixed(1)).join(' ')} ${wait <= MAX_WAIT_S ? '✓' : '✗'}`,
);
// M9-01: in the long runs, no act may leave the median player more than this long with nothing to buy
const MAX_ACT_WAIT_MIN = 10;
if (ACT2)
  for (const a of ['I', 'II', 'III', 'IV']) {
    const k = `wait${a}`;
    const ws = runs.map((r) => (r[k] ?? NaN) / 60000).filter((v) => !Number.isNaN(v));
    if (!ws.length) continue;
    const m = median(ws);
    if (m > MAX_ACT_WAIT_MIN) ok = false;
    console.log(
      `${`Longest wait, Act ${a}`.padEnd(28)} ≤${MAX_ACT_WAIT_MIN}m  ${m.toFixed(1).padStart(6)}m  ${ws.map((v) => v.toFixed(1).padStart(5)).join(' ')} ${m <= MAX_ACT_WAIT_MIN ? '✓' : '✗'}`,
    );
  }
if (!ACT2)
  console.log(
    `${'Echoes at first Cave-in'.padEnd(28)}  6–10   ${String(ech).padStart(6)}   ${runs.map((r) => String(r.echoes).padStart(5)).join(' ')} ${ech >= 6 && ech <= 10 ? '✓' : '✗'}`,
  );
console.log(
  `\nDepth reached (ft): ${runs.map((r) => r.depth).join(', ')} · miners: ${runs.map((r) => r.miners).join(', ')}`,
);
console.log(
  ok ? '\nNo pacing target is more than 15% late.' : '\nSome pacing targets are more than 15% late.',
);
// --strict makes a miss fail the run, so CI catches pacing regressions
if (!ok && args.strict === 'true') process.exitCode = 1;

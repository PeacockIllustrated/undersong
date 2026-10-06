// Headless balance sim: a bot plays like an engaged player and reports time to each canon §5 milestone.
// Usage: npm run sim -- [--seeds=5] [--until=first-cavein] [--minutes=90]
import { TICK_MS, SHAFT_X } from '../src/data/constants';
import { MATERIALS, isMineable } from '../src/data/materials';
import { lightFactor } from '../src/data/light';
import { apply } from '../src/sim/actions';
import { canCaveIn, echoGain } from '../src/sim/cavein';
import { minerCost, nextHaul, nextPick, canPay } from '../src/sim/economy';
import { createGame, type Game } from '../src/sim/game';
import { shaftFloor } from '../src/sim/miners';
import { reach, workable } from '../src/sim/reach';
import { step } from '../src/sim/step';
import { NEIGH4 } from '../src/world/world';
import { line4 } from '../src/sim/geom';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);
const SEEDS = Number(args.seeds ?? 5);
/** How often the bot looks at the screen, in ms. An engaged player, not a perfect one. */
const ATTENTION_MS = Number(args.attention ?? 1500);
const MINUTES = Number(args.minutes ?? 120);

// canon §5 (ADR-015). A target with `atMost` passes when the median is at or under it.
const TARGETS: [string, string, number, boolean?][] = [
  ['bar', 'First bar smelted', 1, true],
  ['miner', 'First miner hired', 8],
  ['verse0', 'Verse I found', 10],
  ['ft150', '150 ft', 20],
  ['caveInReady', 'First Cave-in available', 45],
];

function foremanIdle(g: Game): boolean {
  return !g.state.foreman.target && g.state.foreman.queue.length === 0;
}

/** Nearest workable ore to the foreman, preferring the vein he is on. */
function nearestOre(g: Game, maxD = 7): { x: number; y: number } | null {
  const w = g.world;
  const f = g.state.foreman;
  let best: { x: number; y: number } | null = null;
  let bd = Infinity;
  for (let y = Math.max(0, f.y - maxD); y <= Math.min(w.h - 1, f.y + maxD); y++)
    for (let x = Math.max(1, f.x - maxD); x <= Math.min(w.w - 2, f.x + maxD); x++) {
      const m = w.get(x, y);
      if (!MATERIALS[m]?.isOre) continue;
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
    if (s.verses.run[c.verse] || c.verse > 1) continue;
    if (c.y >= floor) return null;
    const dir = Math.sign(c.x - SHAFT_X);
    const path: { x: number; y: number }[] = [];
    for (let x = SHAFT_X + dir; x !== c.x; x += dir)
      if (isMineable(g.world.get(x, c.y))) path.push({ x, y: c.y });
    return path.length ? path : null;
  }
  return null;
}

function placeTorches(g: Game): void {
  const s = g.state;
  const r = reach(g);
  for (const m of s.miners) {
    if (!m.target || s.res.torch.lt(1)) continue;
    if (lightFactor(g.world.faceLight(m.target.x, m.target.y)) >= 1) continue;
    const near = Object.entries(s.world.objects).some(([k, o]) => {
      const i = Number(k);
      return (
        o === 'torch' && Math.abs((i % g.world.w) - m.x) + Math.abs(Math.floor(i / g.world.w) - m.y) <= 4
      );
    });
    if (near) continue;
    for (const [dx, dy] of NEIGH4) {
      const x = m.x + dx;
      const y = m.y + dy;
      if (
        g.world.inside(x, y) &&
        r[y * g.world.w + x] &&
        !s.world.objects[String(g.world.idx(x, y))] &&
        y > g.world.surf[x]!
      ) {
        apply(g, { type: 'tap', x, y, tool: 'torch' });
        break;
      }
    }
  }
  for (const pest of [...s.pests]) apply(g, { type: 'tap', x: pest.x, y: pest.y, tool: 'dig' });
}

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

function playOne(seed: number): Record<string, number> & { echoes: number } {
  const g = createGame(seed);
  const s = g.state;
  const limit = MINUTES * 60 * 1000;
  for (let t = 0; t < limit; t += TICK_MS) {
    if (t % ATTENTION_MS === 0) {
      if (foremanIdle(g)) {
        const tunnel = verseTunnel(g);
        const needCopper =
          s.miners.length < 2 || s.pickTier < 1 || s.res.copperBar.lt(minerCost(s).amount.div(2));
        const ore = !tunnel && needCopper ? nearestOre(g, 5) : null;
        if (tunnel) apply(g, { type: 'digPath', tiles: tunnel });
        else if (ore) {
          const f = g.state.foreman;
          const tiles = line4({ x: f.x, y: f.y }, ore).filter((t) => isMineable(g.world.get(t.x, t.y)));
          apply(g, { type: 'digPath', tiles });
        } else apply(g, { type: 'dig', x: SHAFT_X, y: shaftFloor(g) });
      }
      shop(g);
      placeTorches(g);
      s.story.events.length = 0;
      if (canCaveIn(s) && args.until === 'first-cavein') break;
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
  return {
    ...s.stats.firsts,
    echoes: echoGain(s).toNumber(),
    depth: s.stats.maxDepthD * 4,
    miners: s.miners.length,
  };
}

const runs = Array.from({ length: SEEDS }, (_, i) => playOne(1000 + i * 7919));
const median = (xs: number[]): number => {
  const a = [...xs].sort((p, q) => p - q);
  return a.length ? a[Math.floor(a.length / 2)]! : NaN;
};
const mins = (ms: number | undefined): string =>
  ms === undefined ? '  —  ' : (ms / 60000).toFixed(1).padStart(5);

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
console.log(
  `${'Echoes at first Cave-in'.padEnd(28)}  6–10   ${String(ech).padStart(6)}   ${runs.map((r) => String(r.echoes).padStart(5)).join(' ')} ${ech >= 6 && ech <= 10 ? '✓' : '✗'}`,
);
console.log(
  `\nDepth reached (ft): ${runs.map((r) => r.depth).join(', ')} · miners: ${runs.map((r) => r.miners).join(', ')}`,
);
console.log(ok ? '\nAll pacing targets within ±15%.' : '\nSome pacing targets are outside ±15%.');

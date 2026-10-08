// Holloway & Co. balance bot (H8): a headless Foreman plays contracts and reports how far each one gets, how long
// it took, and who did the work. Usage: npm run sim:co -- [--seeds=3] [--contracts=8] [--rules=tightLedger,...]
// The bot is a fair, not a perfect, player: it walks to the nearest coal or ore it can dig, tunnels there at the
// pick's real speed, pays a walking toll for every tile it covers, and climbs back to the kibble when its pack is
// full or the bell is close. At night it buys the store greedily; after a Cave-in it buys the Survey Book.
import { SHAFT_X, SKY_ROWS } from '../src/data/constants';
import { M, canDig } from '../src/data/materials';
import { BODY, BOOK, DROPS, SHOP, type RuleId, type ShopId } from '../src/co/data/co';
import { idleControl } from '../src/co/sim/body';
import { buy, buyBook, duskDone, nextDay, settleDusk, signContract } from '../src/co/sim/contract';
import { breakTile, digSeconds, packOre, stepDay } from '../src/co/sim/day';
import { newGame, type Game } from '../src/co/sim/state';
import { bookCost, packCap, pickTier, runMult } from '../src/co/sim/stats';

const arg = (k: string, d: string): string =>
  process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const SEEDS = Number(arg('seeds', '3'));
const CONTRACTS = Number(arg('contracts', '8'));
const RULES = arg('rules', '').split(',').filter(Boolean) as RuleId[];
const DT = 1 / 20;
/** Humans are not straight lines: every tile walked costs this much more than the run speed says. */
const TOLL = 1.8;
/** Seconds a night costs a real player at the store. */
const NIGHT_S = 25;

/** The store, in the order an eager player wants things. */
const WANT: ShopId[] = [
  'pick',
  'hand',
  'pack',
  'whetstone',
  'deputy',
  'hours',
  'putter',
  'shotfirer',
  'lampman',
  'boots',
  'footKibble',
  'ladders',
  'shaft',
  'charges',
  'blast',
  'pumpman',
  'doubleJump',
  'wings',
  'jetpack',
  'scatter',
  'mortar',
  'drill',
  'lance',
];

interface Report {
  seed: number;
  /** The day each contract fell on, its Echoes, and its length in minutes. */
  contracts: { days: number; echoes: number; minutes: number }[];
  firstCaveInMin: number;
  bestDay: number;
  hand: number;
  crew: number;
  haul: number;
  tools: Record<string, number>;
  buys: number;
}

function wait(g: Game, seconds: number, at: { x: number; y: number }): void {
  const ctl = idleControl();
  const d = g.day!;
  for (let t = 0; t < seconds && g.s.phase === 'day'; t += DT) {
    d.body.x = at.x;
    d.body.y = at.y;
    d.body.vx = 0;
    d.body.vy = 0;
    stepDay(g, ctl, DT);
    g.events.length = 0;
  }
}

/** The nearest tile worth digging that this pick can break, by tiles walked. */
function nearestVein(
  g: Game,
  from: { x: number; y: number },
  skip: Set<number>,
): { x: number; y: number } | null {
  const w = g.world!;
  const tier = pickTier(g.s);
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (let y = SKY_ROWS; y < w.h; y++)
    for (let x = 1; x < w.w - 1; x++) {
      const m = w.get(x, y);
      if (!DROPS[m] || !canDig(m, tier) || skip.has(w.idx(x, y))) continue;
      const dist = Math.abs(x - from.x) + Math.abs(y - from.y) * 1.3;
      if (dist < bestD) {
        bestD = dist;
        best = { x, y };
      }
    }
  return best;
}

const packFull = (g: Game): boolean => g.day!.pack.coal.toNumber() + packOre(g.day!) >= packCap(g.s);

function playDay(g: Game): Record<string, number> {
  const w = g.world!;
  const kibble = { x: SHAFT_X + 0.5, y: w.surf[SHAFT_X] ?? SKY_ROWS };
  let at = { ...kibble };
  const tileS = TOLL / (BODY.run * runMult(g.s));
  const d = g.day!;
  const skip = new Set<number>();
  while (g.s.phase === 'day') {
    const home = (Math.abs(at.x - kibble.x) + Math.abs(at.y - kibble.y)) * tileS;
    const left = d.length - d.t;
    const carrying = d.pack.coal.gt(0) || packOre(d) > 0;
    if (packFull(g) || (carrying && left < home + 4)) {
      wait(g, home, at);
      at = { ...kibble };
      wait(g, DT * 2, at);
      continue;
    }
    const v = nearestVein(g, at, skip);
    if (!v) {
      wait(g, 1, at);
      continue;
    }
    // tunnel there one tile at a time, digging whatever is in the way
    const t0 = d.t;
    let x = Math.floor(at.x);
    let y = Math.round(at.y) - 1;
    while ((x !== v.x || y !== v.y) && g.s.phase === 'day' && !packFull(g)) {
      if (x !== v.x) x += Math.sign(v.x - x);
      else y += Math.sign(v.y - y);
      const m = w.get(x, y);
      if (m !== M.AIR) {
        if (!canDig(m, pickTier(g.s)) || m === M.BEDROCK || m === M.CARVING) {
          // something too hard is in the way: give up on this vein and lose a moment finding another
          skip.add(w.idx(v.x, v.y));
          wait(g, 0.5, at);
          break;
        }
        wait(g, digSeconds(g, x, y), at);
        if (g.s.phase !== 'day') break;
        breakTile(g, x, y, true);
        g.events.length = 0;
      }
      wait(g, tileS, at);
      at = { x: x + 0.5, y: y + 1 };
    }
    if (d.t === t0 && g.s.phase === 'day') {
      skip.add(w.idx(v.x, v.y));
      wait(g, 0.2, at);
    }
  }
  while (!duskDone(g)) {
    stepDay(g, idleControl(), DT);
    g.events.length = 0;
  }
  const tools = { ...d.toolTiles } as Record<string, number>;
  settleDusk(g);
  return tools;
}

function shop(g: Game): number {
  let n = 0;
  for (let round = 0; round < 400; round++) {
    const id = WANT.find((k) => SHOP.some((s) => s.id === k) && buy(g, k));
    if (!id) break;
    n++;
  }
  return n;
}

function book(g: Game): void {
  for (let round = 0; round < 400; round++) {
    const ids = BOOK.map((b) => b.id).filter((id) => {
      const c = bookCost(g.s, id);
      return c && g.s.meta.echoes.gte(c);
    });
    if (!ids.length) return;
    ids.sort((a, b) => bookCost(g.s, a)!.cmp(bookCost(g.s, b)!));
    buyBook(g, ids[0]!);
  }
}

function play(seed: number): Report {
  const g = newGame(seed);
  const r: Report = {
    seed,
    contracts: [],
    firstCaveInMin: 0,
    bestDay: 0,
    hand: 0,
    crew: 0,
    haul: 0,
    tools: {},
    buys: 0,
  };
  let clock = 0;
  for (let k = 0; k < CONTRACTS; k++) {
    signContract(g, seed * 101 + k, { rules: RULES });
    const start = clock;
    for (;;) {
      clock += g.day!.length;
      for (const [t, n] of Object.entries(playDay(g))) r.tools[t] = (r.tools[t] ?? 0) + n;
      const t = g.s.tally!;
      r.hand += t.byHand.toNumber();
      r.crew += t.byCrew.toNumber();
      r.haul += t.byHaul.toNumber();
      if (g.s.phase !== 'night') break;
      clock += NIGHT_S;
      r.buys += shop(g);
      nextDay(g);
    }
    const c = g.s.caveIn!;
    r.contracts.push({ days: g.s.contract.day, echoes: c.echoes.toNumber(), minutes: (clock - start) / 60 });
    if (k === 0) r.firstCaveInMin = clock / 60;
    clock += NIGHT_S;
    book(g);
  }
  r.bestDay = g.s.meta.bestDay;
  return r;
}

const reports: Report[] = [];
for (let i = 0; i < SEEDS; i++) {
  const r = play(1000 + i * 7919);
  reports.push(r);
  const line = r.contracts.map((c) => `${c.days}d/${c.echoes}e/${c.minutes.toFixed(1)}m`).join('  ');
  console.log(`seed ${r.seed}: ${line}`);
}

const med = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const pct = (a: number, all: number): string => `${Math.round((100 * a) / Math.max(1, all))}%`;
const sum = (f: (r: Report) => number): number => reports.reduce((a, r) => a + f(r), 0);
const coal = sum((r) => r.hand + r.crew + r.haul);
const tiles = sum((r) => Object.values(r.tools).reduce((a, n) => a + n, 0));
const tools: Record<string, number> = {};
for (const r of reports) for (const [t, n] of Object.entries(r.tools)) tools[t] = (tools[t] ?? 0) + n;

console.log('\n== Holloway & Co. balance ==');
console.log(`rules: ${RULES.join(', ') || 'none'}   seeds: ${SEEDS}   contracts: ${CONTRACTS}`);
console.log(`first Cave-in: median ${med(reports.map((r) => r.firstCaveInMin)).toFixed(1)} min`);
for (let k = 0; k < CONTRACTS; k++) {
  const cs = reports.map((r) => r.contracts[k]!);
  console.log(
    `contract ${k + 1}: median fell on day ${med(cs.map((c) => c.days))}, ${med(cs.map((c) => c.echoes))} Echoes, ${med(cs.map((c) => c.minutes)).toFixed(1)} min`,
  );
}
console.log(`best day reached: median ${med(reports.map((r) => r.bestDay))}`);
console.log(
  `coal sent up: ${pct(
    sum((r) => r.hand),
    coal,
  )} by hand, ${pct(
    sum((r) => r.crew),
    coal,
  )} by crews, ${pct(
    sum((r) => r.haul),
    coal,
  )} hauled`,
);
console.log(
  `tiles broken by tool: ${Object.entries(tools)
    .map(([t, n]) => `${t} ${pct(n, tiles)}`)
    .join(', ')}`,
);
console.log(`store buys per contract: ${(sum((r) => r.buys) / (SEEDS * CONTRACTS)).toFixed(1)}`);

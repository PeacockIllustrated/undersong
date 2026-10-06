// The Cave-in: the village forgets, the Foreman keeps Echoes and verses. canon §4.3, §4.10
import { CAVE_IN, ECHO } from '../data/economy';
import { FT_PER_TILE, SHAFT_X, SKY_ROWS } from '../data/constants';
import { D, Decimal } from './decimal';
import { attach, freshWorld, type Game } from './game';
import { hash3 } from './rng';
import { emptyRes, type GameState } from './state';
import { UPGRADE_FX } from '../data/upgrades';
import type { ResKey } from '../data/resources';

export function maxFt(s: GameState): number {
  return s.stats.maxDepthD * FT_PER_TILE;
}

export function versesThisRun(s: GameState): number {
  return s.verses.run.filter(Boolean).length;
}

export function canCaveIn(s: GameState): boolean {
  return maxFt(s) >= CAVE_IN.minFt && s.verses.run[CAVE_IN.verse] === true;
}

/** canon §4.3 floor( sqrt(maxDepth_ft / 10) × (1 + 0.25 × verses found this run) ) */
export function echoGain(s: GameState): Decimal {
  const base = Math.floor(Math.sqrt(maxFt(s) / ECHO.divisor) * (1 + ECHO.perVerse * versesThisRun(s)));
  return D(s.upgrades.surveyInstinct ? Math.floor(base * UPGRADE_FX.surveyInstinct) : base);
}

/** Seed for the mountain of a given cycle: the same village, a different dig. */
export function cycleSeed(seed: number, cycle: number): number {
  return Math.floor(hash3(seed, cycle, 0xcafe) * 0x7fffffff);
}

export function caveIn(g: Game): boolean {
  const s = g.state;
  if (!canCaveIn(s)) return false;
  const gain = echoGain(s);
  s.echoes = s.echoes.add(gain);
  s.echoesEver = s.echoesEver.add(gain);
  s.survey.push({
    cycle: s.cycle,
    depthFt: maxFt(s),
    verses: versesThisRun(s),
    echoes: gain.toString(),
    hand: 'yours',
  });
  s.stats.caveIns++;
  s.cycle++;
  s.seed = cycleSeed(s.seed, s.cycle);
  resetRun(s);
  attach(g, freshWorld(s));
  g.events.push({ kind: 'caveIn' });
  s.story.events.push({ kind: 'caveIn' });
  return true;
}

/** What the village forgets. Echoes, upgrades, known verses, the Survey Book and best depth stay. */
export function resetRun(s: GameState): void {
  // what the Echo upgrades carry through
  s.heirloomTier = s.upgrades.heirloomPick ? Math.max(0, s.stats.bestPick - 1) : 0;
  const oldShaftD = s.upgrades.oldShafts ? Math.floor(s.stats.bestDepthD * UPGRADE_FX.oldShaftsFrac) : 0;
  s.t = 0;
  s.res = emptyRes();
  s.underground = emptyRes();
  s.buildings = { forge: 1, lampworks: 0, kiln: 0, songloom: 0 };
  s.pickTier = s.heirloomTier;
  s.whetstone = 0;
  s.haulTier = s.upgrades.rememberedRope ? 1 : 0;
  s.forge = { progress: 0, recipe: 'auto', next: 0 };
  s.haulAcc = 0;
  s.kilnProgress = 0;
  s.lampProgress = 0;
  s.helperAcc = 0;
  s.miners = [];
  s.pests = [];
  s.glints = [];
  s.foreman = {
    x: SHAFT_X - 1,
    y: SKY_ROWS - 1,
    target: null,
    queue: [],
    work: 0,
    chain: 0,
    idleMs: 0,
    lastOre: null,
  };
  s.world = {
    diffs: {},
    objects: {},
    water: null,
    endlessRows: s.world.endlessRows,
    oldShaftD,
  };
  if (s.upgrades.bramsLedger)
    for (const [k, n] of Object.entries(UPGRADE_FX.bramsLedger)) s.res[k as ResKey] = D(n);
  s.verses.run = new Array(12).fill(false);
  s.stats.maxDepthD = 0;
  s.stats.tilesMined = 0;
  s.stats.firsts = {};
  s.story.seen = [];
  s.story.events = [];
}

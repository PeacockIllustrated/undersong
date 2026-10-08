// Feats (H8): the achievements. Counters come from the day's events and the nightly tally; records are read off
// the save. hybrid canon §24. Pure: state in, state and events out.
import { FEATS, FOREMAN_IDS, RULE_IDS, SEAM_IDS, type FeatKey } from '../data/co';
import type { CoEvent, Game } from './state';

const bump = (g: Game, k: FeatKey, n = 1): void => {
  const st = g.s.meta.stats;
  st[k] = (st[k] ?? 0) + n;
};
const best = (g: Game, k: FeatKey, n: number): void => {
  const st = g.s.meta.stats;
  st[k] = Math.max(st[k] ?? 0, n);
};

/** Count what happened in the events pushed since `from`. */
export function countEvents(g: Game, from: number): void {
  for (let i = from; i < g.events.length; i++) countEvent(g, g.events[i]!);
}

function countEvent(g: Game, e: CoEvent): void {
  switch (e.t) {
    case 'break':
      bump(g, 'tiles');
      if (e.coal > 0) bump(g, 'coal', e.coal);
      if (e.ore > 0) bump(g, 'ore', e.ore);
      if ((e.coal > 0 || e.ore > 0) && g.day) best(g, 'bestRush', g.day.rush.chain + 1);
      break;
    case 'chest':
      bump(g, 'chests');
      if (e.relic) bump(g, 'relics');
      if (e.gem) bump(g, 'gems');
      break;
    case 'veinBreak':
      bump(g, 'veinBreaks');
      break;
    case 'scatter':
      if (e.kick) bump(g, 'rocketJumps');
      break;
    case 'mortar':
      bump(g, 'mortars');
      break;
    case 'rig':
      if (e.placed) bump(g, 'rigs');
      break;
    case 'platform':
      bump(g, 'platforms');
      break;
    case 'ladder':
      bump(g, 'ladders');
      break;
    case 'boom':
      bump(g, 'booms');
      break;
    case 'overcome':
      bump(g, 'overcome');
      break;
    default:
  }
}

/** The nightly tally's counters: days, grades and the streak. */
export function countTally(g: Game): void {
  const t = g.s.tally;
  if (!t?.passed) return;
  bump(g, 'days');
  if (t.grade === 'Good shift') bump(g, 'good');
  if (t.grade === 'Bumper shift') bump(g, 'bumper');
  if (t.grade === 'Record shift') bump(g, 'record');
  best(g, 'bestStreak', t.streak);
}

export const countFeat = bump;
export const recordFeat = best;

/** How far the village is towards a feat's key. */
export function featValue(g: Game, k: FeatKey): number {
  const s = g.s;
  const m = s.meta;
  const has = (pre: string, ids: readonly string[]): number =>
    ids.filter((id) => m.badges.includes(pre + id)).length;
  switch (k) {
    case 'contracts':
      return m.contracts;
    case 'bestDay':
      return Math.max(m.bestDay, s.phase === 'day' ? s.contract.day - 1 : 0);
    case 'verseSet':
      return m.verses.length;
    case 'badges':
      return m.badges.length;
    case 'fmBadges':
      return has('fm:', FOREMAN_IDS);
    case 'seamBadges':
      return has('seam:', SEAM_IDS);
    case 'ruleBadges':
      return has('rule:', RULE_IDS);
    case 'echoesEver':
      return m.echoesEver.toNumber();
    case 'hands':
      return s.contract.levels.hand;
    case 'pick':
      return s.contract.levels.pick;
    case 'newSong':
      return m.newSong;
    case 'endQuota':
      return m.endings.includes('quota') ? 1 : 0;
    case 'endSong':
      return m.endings.includes('song') ? 1 : 0;
    case 'maxRules':
      return s.contract.rules.length;
    default:
      return m.stats[k] ?? 0;
  }
}

/** Award every feat now reached, once, with an event for each. */
export function checkFeats(g: Game): void {
  const got = g.s.meta.feats;
  for (const f of FEATS) {
    if (got.includes(f.id) || featValue(g, f.key) < f.n) continue;
    got.push(f.id);
    g.events.push({ t: 'feat', id: f.id });
  }
}

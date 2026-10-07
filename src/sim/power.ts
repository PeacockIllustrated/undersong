// Multipliers from Echoes and Echo upgrades, in one place so every rate reads them the same way. canon §4.11, §10
import { ECHO_POWER, METALWORK, VEIN_RUSH, WHETSTONE } from '../data/economy';
import { UPGRADE_FX } from '../data/upgrades';
import { CHARM_FX, type CharmId } from '../data/charms';
import { PICKS } from '../data/items';
import { HOMECOMING, VERSE_POWER } from '../data/helpers';
import type { GameState } from './state';
import { feastMult, handFood, minerFood } from './surface';
import { boostMult, curioMult } from './finds';
import { deepPickMult } from './beyond';
import { KEY_FX } from '../data/beyond';

/** An equipped Song-loom charm's multiplier, or 1. canon §13 */
export function charm(s: GameState, id: CharmId): number {
  return s.charms.equipped.includes(id) ? CHARM_FX[id] : 1;
}

/** The village's pick power, with the Old Pick charm. */
export function pickPower(s: GameState): number {
  return (PICKS[s.pickTier]?.power ?? 1) * deepPickMult(s) * charm(s, 'oldPick');
}

/** canon §4.11: every Echo ever earned speeds the whole village a little. */
export function echoMult(s: GameState): number {
  return 1 + ECHO_POWER * s.echoesEver.toNumber();
}

/** canon §4.13: every verse ever known speeds the whole village. */
export function verseMult(s: GameState): number {
  return 1 + VERSE_POWER * s.verses.known.filter(Boolean).length;
}

/** canon §4.12 Homecoming: after a Cave-in the village works fast until it is back near its best depth. */
export function homecoming(s: GameState): number {
  return s.stats.caveIns > 0 && s.stats.maxDepthD < homeUntilD(s) ? HOMECOMING.mult : 1;
}
export const homeUntilD = (s: GameState): number => Math.floor(s.stats.bestDepthD * HOMECOMING.frac);

/** Everything that speeds every worker at once. */
export function villageMult(s: GameState): number {
  return (
    echoMult(s) * verseMult(s) * homecoming(s) * feastMult(s) * (s.songKey === 'hard' ? KEY_FX.hard.dig : 1)
  );
}

/** Deep Hands: everyone digs faster below 1000 ft. */
export function deepMult(s: GameState, depthTiles: number): number {
  return s.upgrades.deepHands && depthTiles >= UPGRADE_FX.deepHandsFromD ? UPGRADE_FX.deepHands : 1;
}

export function rushStep(s: GameState): number {
  return s.upgrades.oldCalluses ? UPGRADE_FX.oldCallusesStep : VEIN_RUSH.step;
}

export function minerMult(s: GameState): number {
  return (
    villageMult(s) *
    (s.upgrades.strongBacks ? UPGRADE_FX.strongBacks : 1) *
    charm(s, 'name') *
    minerFood(s) *
    metalworkMult(s, 'miners') *
    curioMult(s, 'miners') *
    boostMult(s, 'miners')
  );
}

/** M9-02: speed from the deep metals' buys, for miners or for hand-mining. */
export function metalworkMult(s: GameState, fx: 'miners' | 'hands'): number {
  let k = 1;
  for (const m of METALWORK) if (m.fx === fx) k += m.per * (s.metalwork[m.id] ?? 0);
  return k;
}

export function handsMult(s: GameState): number {
  return (
    villageMult(s) *
    (s.upgrades.steadyHands ? UPGRADE_FX.steadyHands : 1) *
    (1 + WHETSTONE.perLevel * s.whetstone) *
    charm(s, 'hush') *
    handFood(s) *
    metalworkMult(s, 'hands') *
    curioMult(s, 'hands') *
    boostMult(s, 'hands')
  );
}

export function upkeepMult(s: GameState): number {
  return (s.upgrades.wrensWicks ? UPGRADE_FX.wrensWicks : 1) * charm(s, 'lantern');
}

export function lumenMult(s: GameState): number {
  return (s.upgrades.brightPages ? UPGRADE_FX.brightPages : 1) * charm(s, 'candle');
}

export function pestMult(s: GameState): number {
  return s.upgrades.mothWard ? UPGRADE_FX.mothWard : 1;
}

export function torchMult(s: GameState): number {
  return (s.upgrades.lamplit ? UPGRADE_FX.lamplit : 1) * charm(s, 'lamp');
}

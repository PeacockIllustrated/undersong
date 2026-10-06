// Multipliers from Echoes and Echo upgrades, in one place so every rate reads them the same way. canon §4.11, §10
import { ECHO_POWER, VEIN_RUSH } from '../data/economy';
import { UPGRADE_FX } from '../data/upgrades';
import { CHARM_FX, type CharmId } from '../data/charms';
import { PICKS } from '../data/items';
import type { GameState } from './state';

/** An equipped Song-loom charm's multiplier, or 1. canon §13 */
export function charm(s: GameState, id: CharmId): number {
  return s.charms.equipped.includes(id) ? CHARM_FX[id] : 1;
}

/** The village's pick power, with the Old Pick charm. */
export function pickPower(s: GameState): number {
  return (PICKS[s.pickTier]?.power ?? 1) * charm(s, 'oldPick');
}

/** canon §4.11: every Echo ever earned speeds the whole village a little. */
export function echoMult(s: GameState): number {
  return 1 + ECHO_POWER * s.echoesEver.toNumber();
}

/** Deep Hands: everyone digs faster below 1000 ft. */
export function deepMult(s: GameState, depthTiles: number): number {
  return s.upgrades.deepHands && depthTiles >= UPGRADE_FX.deepHandsFromD ? UPGRADE_FX.deepHands : 1;
}

export function rushStep(s: GameState): number {
  return s.upgrades.oldCalluses ? UPGRADE_FX.oldCallusesStep : VEIN_RUSH.step;
}

export function minerMult(s: GameState): number {
  return echoMult(s) * (s.upgrades.strongBacks ? UPGRADE_FX.strongBacks : 1) * charm(s, 'name');
}

export function handsMult(s: GameState): number {
  return echoMult(s) * (s.upgrades.steadyHands ? UPGRADE_FX.steadyHands : 1) * charm(s, 'hush');
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

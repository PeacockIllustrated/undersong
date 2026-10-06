// Multipliers from Echoes and Echo upgrades, in one place so every rate reads them the same way. canon §4.11, §10
import { ECHO_POWER, VEIN_RUSH } from '../data/economy';
import { UPGRADE_FX } from '../data/upgrades';
import type { GameState } from './state';

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
  return echoMult(s) * (s.upgrades.strongBacks ? UPGRADE_FX.strongBacks : 1);
}

export function handsMult(s: GameState): number {
  return echoMult(s) * (s.upgrades.steadyHands ? UPGRADE_FX.steadyHands : 1);
}

export function upkeepMult(s: GameState): number {
  return s.upgrades.wrensWicks ? UPGRADE_FX.wrensWicks : 1;
}

export function lumenMult(s: GameState): number {
  return s.upgrades.brightPages ? UPGRADE_FX.brightPages : 1;
}

export function pestMult(s: GameState): number {
  return s.upgrades.mothWard ? UPGRADE_FX.mothWard : 1;
}

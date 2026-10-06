// Hands about the village: helpers that take chores off the Foreman. canon §14 (ADR-020)
import { HELPERS, HELPER_FX, type HelperId } from '../data/helpers';
import { CRAFTS, TORCH_CRAFT } from '../data/economy';
import { LIGHT, lightFactor } from '../data/light';
import type { ObjKind } from '../data/objects';
import type { ResKey } from '../data/resources';
import { NEIGH4 } from '../world/world';
import { PUMP } from '../data/water';
import { SHAFT_X } from '../data/constants';
import { flooded } from './water';
import { coolCache, heatAt } from './heat';
import { HEAT } from '../data/heat';
import { FIELDS } from '../data/surface';
import { D, type Decimal } from './decimal';
import { canPay, flat, pay } from './economy';
import type { Game } from './game';
import { reach } from './reach';
import type { GameState, Pest } from './state';
import { first, say } from './story';
import { craftCost } from './village';

export function helperDef(id: HelperId): (typeof HELPERS)[number] {
  return HELPERS.find((h) => h.id === id)!;
}

/** Each helper is offered once its chore has shown up, in any cycle. */
export function helperOffered(s: GameState, id: HelperId): boolean {
  if (s.helpers[id]) return true;
  if (id === 'lamps') return s.miners.length > 0 || s.stats.caveIns > 0;
  if (id === 'pell')
    return s.story.ever.some((l) => l === 'beetle' || l === 'moth' || l === 'eel' || l === 'wisp');
  if (id === 'pumps') return s.story.ever.includes('flooded');
  if (id === 'vents') return s.story.ever.includes('tooHot');
  if (id === 'tansy') return s.surface.harvestsEver >= FIELDS.handsAfter;
  if (id === 'rook') return s.surface.chopsEver > 0;
  return s.stats.collapses > 0;
}

/** Cost of the next level, or null at the top. */
export function helperCost(s: GameState, id: HelperId): { res: ResKey; amount: Decimal }[] | null {
  const lv = helperDef(id).levels[s.helpers[id] ?? 0];
  return lv ? flat(lv) : null;
}

export function hireHelper(g: Game, id: HelperId): boolean {
  const s = g.state;
  const c = helperCost(s, id);
  if (!c || !helperOffered(s, id) || !pay(s, c)) return false;
  s.helpers[id] = (s.helpers[id] ?? 0) + 1;
  g.events.push({ kind: 'bought', what: `helper:${id}` });
  first(g, `helper_${id}`);
  say(g, `helper_${id}`);
  return true;
}

/** Shoo a pest: the same as a tap. Golems take a few. Returns true once it is gone. */
export function hitPest(g: Game, pest: Pest): boolean {
  const s = g.state;
  if (pest.hp !== undefined && pest.hp > 1) {
    pest.hp--;
    g.events.push({ kind: 'pest', x: pest.x, y: pest.y, cleared: false });
    return false;
  }
  s.pests = s.pests.filter((p) => p !== pest);
  for (const m of s.miners) if (m.stalledBy === pest.id) m.stalledBy = null;
  if (pest.kind === 'moth') {
    g.world.dimmed.delete(g.world.idx(pest.x, pest.y));
    g.world.touch(pest.x, pest.y);
  }
  g.events.push({ kind: 'pest', x: pest.x, y: pest.y, cleared: true });
  return true;
}

/** Put one object from stock on an open, reachable tile. */
export function placeFromStock(g: Game, x: number, y: number, kind: ObjKind & ResKey): boolean {
  const s = g.state;
  const w = g.world;
  const key = String(w.idx(x, y));
  if (s.world.objects[key] || !w.isAir(x, y) || y <= w.surf[x]! || s.res[kind].lt(1)) return false;
  if (!reach(g)[w.idx(x, y)]) return false;
  s.res[kind] = s.res[kind].sub(1);
  s.world.objects[key] = kind;
  w.touch(x, y);
  coolCache(g);
  return true;
}

function near(g: Game, kind: ObjKind, x: number, y: number, r: number): boolean {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (Math.abs(dx) + Math.abs(dy) <= r && g.world.objectAt(x + dx, y + dy) === kind) return true;
  return false;
}

export function stepHelpers(g: Game, dt: number): void {
  const s = g.state;
  // Pell: one pest every few seconds, oldest first
  const pl = s.helpers.pell ?? 0;
  if (pl > 0 && s.pests.length) {
    s.helperAcc += dt;
    const every = HELPER_FX.pellEvery[pl - 1]!;
    while (s.helperAcc >= every && s.pests.length) {
      s.helperAcc -= every;
      hitPest(g, s.pests[0]!);
    }
  } else s.helperAcc = 0;
  // the rest look about once a second
  if (s.t % 1000 !== 0 && dt < 1) return;
  if (s.helpers.lamps) lamplighters(g);
  if (s.helpers.props && s.buildings.kiln > 0 && s.res.support.lt(HELPER_FX.keepSupports))
    if (pay(s, craftCost(s, 'support'))) s.res.support = s.res.support.add(CRAFTS.support.makes);
  if (s.helpers.pumps) pumpCrew(g);
  if (s.helpers.vents) ventCrew(g);
}

/** Wren's cold lamps: a vent beside the hottest face nobody can work, and always one in hand. canon §14, §15 */
function ventCrew(g: Game): void {
  const s = g.state;
  const w = g.world;
  const cost = flat(CRAFTS.vent.cost);
  if (s.res.vent.lt(HELPER_FX.keepVents) && canPay(s, cost)) {
    pay(s, cost);
    s.res.vent = s.res.vent.add(CRAFTS.vent.makes);
  }
  // reach first: it also sets reachMaxY
  const r = reach(g);
  if (s.res.vent.lt(1) || w.depth(g.reachMaxY) < HEAT.fromD) return;
  // the open tiles of the deepest few rows, next to rock too hot to work
  let best: { x: number; y: number; h: number } | null = null;
  for (let y = g.reachMaxY; y > g.reachMaxY - HELPER_FX.pumpRows && y > 0; y--)
    for (let x = 1; x < w.w - 1; x++) {
      if (!r[w.idx(x, y)] || w.objectAt(x, y)) continue;
      for (const [dx, dy] of NEIGH4) {
        if (w.isAir(x + dx, y + dy)) continue;
        const h = heatAt(g, x + dx, y + dy);
        if (h >= HEAT.stopAt && (!best || h > best.h)) best = { x, y, h };
      }
    }
  if (best) placeFromStock(g, best.x, best.y, 'vent');
}

/** Any flooded tile within a pump's reach of (px, py). */
function wetNear(g: Game, px: number, py: number): boolean {
  const r = PUMP.radius;
  for (let y = py - r; y <= py + r; y++)
    for (let x = px - r; x <= px + r; x++)
      if ((x - px) ** 2 + (y - py) ** 2 <= r * r && flooded(g, x, y)) return true;
  return false;
}

/** Bram's pump crew: dry pumps come back to stock, stock goes to the water, and there is always one in hand. */
function pumpCrew(g: Game): void {
  const s = g.state;
  const w = g.world;
  for (const [k, o] of Object.entries(s.world.objects)) {
    if (o !== 'pump') continue;
    const i = Number(k);
    const x = i % w.w;
    const y = (i - x) / w.w;
    if (wetNear(g, x, y)) continue;
    delete s.world.objects[k];
    s.res.pump = s.res.pump.add(1);
    w.touch(x, y);
  }
  const cost = flat(CRAFTS.pump.cost);
  if (s.res.pump.lt(HELPER_FX.keepPumps) && canPay(s, cost)) {
    pay(s, cost);
    s.res.pump = s.res.pump.add(CRAFTS.pump.makes);
  }
  if (s.res.pump.lt(1)) return;
  // the deepest reachable dry tile with water in a pump's reach, nearest the shaft, not crowding another pump
  const r = reach(g);
  const xs = Array.from({ length: w.w - 2 }, (_, k) => k + 1).sort(
    (a, b) => Math.abs(a - SHAFT_X) - Math.abs(b - SHAFT_X),
  );
  for (let y = g.reachMaxY; y > g.reachMaxY - HELPER_FX.pumpRows && y > 0; y--)
    for (const x of xs) {
      if (!r[w.idx(x, y)] || flooded(g, x, y) || near(g, 'pump', x, y, 3) || !wetNear(g, x, y)) continue;
      if (placeFromStock(g, x, y, 'pump')) return;
    }
}

/** Miners light their own faces from stock; the village keeps the stock topped up. */
function lamplighters(g: Game): void {
  const s = g.state;
  const w = g.world;
  if (s.res.torch.lt(HELPER_FX.keepTorches) && s.res.copperBar.gte(TORCH_CRAFT.cost.n + 1))
    if (pay(s, [{ res: TORCH_CRAFT.cost.res, amount: D(TORCH_CRAFT.cost.n) }]))
      s.res.torch = s.res.torch.add(TORCH_CRAFT.makes);
  const lantern = flat(CRAFTS.lantern.cost);
  if (
    s.buildings.lampworks > 0 &&
    s.res.lantern.lt(HELPER_FX.keepLanterns) &&
    s.res.lumen.gte(HELPER_FX.lanternLumenFloor) &&
    canPay(s, lantern)
  ) {
    pay(s, lantern);
    s.res.lantern = s.res.lantern.add(CRAFTS.lantern.makes);
  }
  for (const m of s.miners) {
    const t = m.target;
    if (!t || lightFactor(w.faceLight(t.x, t.y)) >= 1) continue;
    // below the torch line a lantern does the job a torch can't
    const deep = w.depth(m.y) >= LIGHT.torchDeepFromD && !w.torchSteady;
    const kind: 'lantern' | 'torch' | null =
      deep && s.res.lantern.gte(1) ? 'lantern' : s.res.torch.gte(1) ? 'torch' : null;
    if (!kind || near(g, 'lantern', m.x, m.y, 4) || near(g, 'torch', m.x, m.y, kind === 'torch' ? 2 : 1))
      continue;
    for (const [dx, dy] of [[0, 0], ...NEIGH4] as const)
      if (placeFromStock(g, m.x + dx, m.y + dy, kind)) break;
  }
}

/** Bram's props: a falling roof is held by a support from stock instead. True if it was. */
export function propRoof(g: Game, x: number, y: number): boolean {
  const s = g.state;
  if (!s.helpers.props || s.res.support.lt(1)) return false;
  for (const [dx, dy] of [[0, 0], ...NEIGH4, [1, 1], [-1, 1], [1, -1], [-1, -1]] as const)
    if (placeFromStock(g, x + dx, y + dy, 'support')) return true;
  return false;
}

export const helperIds = (): HelperId[] => HELPERS.map((h) => h.id);

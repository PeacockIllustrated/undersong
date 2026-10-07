// The tool belt (H3): the scatter pick, the mortar, the drill rig and the cold lance, and one-way platforms.
// hybrid canon §18. Pure: the day's state in, the day's state out.
import { M, canDig } from '../../data/materials';
import { DRILL, LANCE, MORTAR, SCATTER, TOOLS, type ToolId } from '../data/co';
import { chest, type Control } from './body';
import { aimTile, breakTile, digSeconds, gangBreak } from './day';
import type { CoState, Game } from './state';
import { pickTier } from './stats';

const lvl = (s: CoState, id: Exclude<ToolId, 'pick'>): number => s.contract.levels[id];

/** How much faster the cold lance cuts hot rock. */
export const lanceMult = (s: CoState): number =>
  LANCE.hot + LANCE.perLevel * Math.max(0, lvl(s, 'lance') - 1);

/** The tools on the belt today: the pick, and every tool bought this contract. */
export const owned = (s: CoState): ToolId[] =>
  TOOLS.filter((t) => t.id === 'pick' || lvl(s, t.id) > 0).map((t) => t.id);

export function selectTool(g: Game, c: Control): void {
  const d = g.day!;
  const have = owned(g.s);
  let next: ToolId | null = null;
  if (c.toolSel !== null) {
    const t = TOOLS[c.toolSel];
    if (t && have.includes(t.id)) next = t.id;
  } else if (c.toolCycle !== 0 && have.length > 1) {
    const i = have.indexOf(d.tool);
    next = have[(i + c.toolCycle + have.length) % have.length]!;
  }
  if (next && next !== d.tool) {
    d.tool = next;
    d.dig = null;
    g.events.push({ t: 'tool', tool: next });
  }
}

/** Fire the tool in hand while the fire button is held. The pick and the lance dig through `dig` instead. */
export function useTool(g: Game, c: Control, dt: number): void {
  const d = g.day!;
  d.toolCd = Math.max(0, d.toolCd - dt);
  if (!c.fire || d.toolCd > 0) return;
  if (d.tool === 'scatter') scatter(g, c);
  else if (d.tool === 'mortar') mortar(g, c);
  else if (d.tool === 'drill') placeRig(g, c);
}

/** Seven rays across a cone; each hits the first rock within range and does a share of a pick's work on it. */
function scatter(g: Game, c: Control): void {
  const d = g.day!;
  const w = g.world!;
  const o = chest(d.body);
  const base = Math.atan2(c.aimY - o.y, c.aimX - o.x);
  const tier = pickTier(g.s);
  const shot = SCATTER.shot * (1 + SCATTER.perLevel * (lvl(g.s, 'scatter') - 1));
  const hit = new Set<number>();
  for (let r = 0; r < 7; r++) {
    const a = base + (r / 6 - 0.5) * 2 * SCATTER.halfAngle;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    for (let t = 0.3; t <= SCATTER.range; t += 0.1) {
      const x = Math.floor(o.x + dx * t);
      const y = Math.floor(o.y + dy * t);
      const m = w.get(x, y);
      if (m === M.AIR) continue;
      const i = w.idx(x, y);
      if (!hit.has(i) && m !== M.BEDROCK && m !== M.CARVING && canDig(m, tier)) {
        hit.add(i);
        d.cracks[i] = (d.cracks[i] ?? 0) + shot;
        if (d.cracks[i]! >= digSeconds(g, x, y)) {
          delete d.cracks[i];
          breakTile(g, x, y, false, 'scatter');
        } else g.events.push({ t: 'chip', x, y, m });
      }
      break;
    }
  }
  // fired down while off the ground, the kick throws the Foreman up: the rocket-jump
  const down = Math.sin(base) > 0.55;
  const kick = down && !d.body.onGround;
  if (kick) {
    d.body.vy = Math.min(d.body.vy, -SCATTER.kick);
    d.body.cut = true;
  }
  d.toolCd = SCATTER.cooldownS;
  g.events.push({ t: 'scatter', x: o.x, y: o.y, ax: Math.cos(base), ay: Math.sin(base), kick });
}

function mortar(g: Game, c: Control): void {
  const d = g.day!;
  if (d.shellsLeft <= 0) {
    refuse(g);
    return;
  }
  const o = chest(d.body);
  const dx = c.aimX - o.x;
  const dy = c.aimY - o.y;
  const len = Math.max(0.01, Math.hypot(dx, dy));
  d.shells.push({
    x: o.x,
    y: o.y,
    vx: (dx / len) * MORTAR.speed,
    vy: (dy / len) * MORTAR.speed - 4,
    life: 4,
  });
  d.shellsLeft--;
  d.toolCd = MORTAR.cooldownS;
  g.events.push({ t: 'mortar', x: o.x, y: o.y });
}

/** A rig is set on the rock it is aimed at, or under the Foreman's feet. */
function placeRig(g: Game, c: Control): void {
  const d = g.day!;
  const w = g.world!;
  d.toolCd = 0.6;
  const t = aimTile(g, c) ?? { x: Math.floor(d.body.x), y: Math.round(d.body.y) };
  if (d.rigsLeft <= 0 || w.get(t.x, t.y) === M.AIR || w.get(t.x, t.y - 1) !== M.AIR) {
    refuse(g);
    return;
  }
  d.rigs.push({ x: t.x, y: t.y, work: 0, depth: 0, done: false });
  d.rigsLeft--;
  g.events.push({ t: 'rig', x: t.x, y: t.y, placed: true });
}

export function placePlatform(g: Game): void {
  const d = g.day!;
  const w = g.world!;
  const x = Math.floor(d.body.x);
  const y = Math.round(d.body.y);
  const i = w.idx(x, y);
  if (d.platforms <= 0 || !w.inside(x, y) || w.get(x, y) !== M.AIR || d.plat[i] || w.objects[String(i)]) {
    refuse(g);
    return;
  }
  d.plat[i] = true;
  d.platforms--;
  w.redraw(x, y);
  g.events.push({ t: 'platform', x, y });
}

function refuse(g: Game): void {
  const d = g.day!;
  if (d.warnT > 0) return;
  g.events.push({ t: 'refused', x: Math.floor(d.body.x), y: Math.floor(d.body.y - 1) });
  d.warnT = 0.6;
}

/** Shells in flight and rigs at work. */
export function stepTools(g: Game, dt: number): void {
  const d = g.day!;
  const w = g.world!;
  for (const sh of d.shells) {
    sh.vy += MORTAR.gravity * dt;
    sh.life -= dt;
    const steps = Math.ceil((Math.hypot(sh.vx, sh.vy) * dt) / 0.25);
    for (let k = 0; k < steps && sh.life > 0; k++) {
      sh.x += (sh.vx * dt) / steps;
      sh.y += (sh.vy * dt) / steps;
      // water does not stop a shell; rock does
      if (w.get(Math.floor(sh.x), Math.floor(sh.y)) !== M.AIR) sh.life = 0;
    }
    if (sh.life <= 0) burst(g, sh.x, sh.y);
  }
  d.shells = d.shells.filter((sh) => sh.life > 0);

  const tier = pickTier(g.s) + 1;
  const speed = 1 + DRILL.perLevel * Math.max(0, lvl(g.s, 'drill') - 1);
  for (const rig of d.rigs) {
    if (rig.done) continue;
    const m = w.get(rig.x, rig.y);
    if (m === M.AIR) {
      rig.y++;
      rig.depth++;
    } else if (m === M.BEDROCK || m === M.CARVING || !canDig(m, tier) || rig.depth >= DRILL.maxDepth) {
      rig.done = true;
      g.events.push({ t: 'rig', x: rig.x, y: rig.y, placed: false });
      continue;
    } else {
      rig.work += (dt * speed) / (digSeconds(g, rig.x, rig.y) * DRILL.secsMult);
      if (rig.work >= 1) {
        rig.work = 0;
        d.toolTiles.drill = (d.toolTiles.drill ?? 0) + 1;
        g.events.push({ t: 'chip', x: rig.x, y: rig.y, m });
        gangBreak(g, rig.x, rig.y);
        rig.y++;
        rig.depth++;
      }
    }
  }
}

/** A mortar shell bursts: a round hole one tier harder than the pick, and the water in it is blown out. */
function burst(g: Game, bx: number, by: number): void {
  const w = g.world!;
  const r = MORTAR.radius;
  const cx = Math.floor(bx);
  const cy = Math.floor(by);
  const tier = pickTier(g.s) + 1;
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++) {
      if (!w.inside(x, y) || (x - cx) ** 2 + (y - cy) ** 2 > (r + 0.5) ** 2) continue;
      if (w.water[w.idx(x, y)]) {
        w.water[w.idx(x, y)] = 0;
        w.redraw(x, y);
      }
      const m = w.get(x, y);
      if (m === M.AIR || m === M.BEDROCK || m === M.CARVING || !canDig(m, tier)) continue;
      if (w.objects[String(w.idx(x, y))] === 'rope') continue;
      breakTile(g, x, y, false, 'mortar');
    }
  g.events.push({ t: 'boom', x: bx, y: by, r });
}

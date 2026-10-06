// Polish item 6: small arrows pinned to the screen edge, pointing at off-screen things that need you.
// Pests are ember, stopped miners orange, a nearby unfound verse gold. Tap one to pan there.
import { EDGE_VERSE_RANGE } from '../data/constants';
import type { UiBridge } from './App';

type Kind = 'pest' | 'miner' | 'verse';
const INSET = 18;
/** Extra room on the right for the depth ruler. */
const RIGHT = 36;
/** Keep clear of the HUD panels at the top and the tray at the bottom. */
const TOP = 70;
const BOTTOM = 116;

export function EdgeMarkers({ ui }: { ui: UiBridge }) {
  const g = ui.game;
  const s = g.state;
  const targets: { kind: Kind; x: number; y: number }[] = [];
  for (const p of s.pests) targets.push({ kind: 'pest', x: p.x, y: p.y });
  for (const m of s.miners) if (m.stalledBy !== null) targets.push({ kind: 'miner', x: m.x, y: m.y });
  const f = s.foreman;
  let best: { x: number; y: number; d: number } | null = null;
  for (const c of g.world.carvings) {
    if (s.verses.run[c.verse]) continue;
    const d = Math.abs(c.x - f.x) + Math.abs(c.y - f.y);
    if (d <= EDGE_VERSE_RANGE && (!best || d < best.d)) best = { x: c.x, y: c.y, d };
  }
  if (best) targets.push({ kind: 'verse', x: best.x, y: best.y });

  // project, keep the off-screen ones, clamp to the edge, merge same-kind markers that land together
  const marks = new Map<
    string,
    { kind: Kind; x: number; y: number; a: number; n: number; tx: number; ty: number }
  >();
  for (const t of targets) {
    const p = ui.toScreen(t.x, t.y);
    const off = p.x < 0 || p.y < 0 || p.x > p.w || p.y > p.h;
    if (!off) continue;
    const cx = p.w / 2;
    const cy = p.h / 2;
    const a = Math.atan2(p.y - cy, p.x - cx);
    const x = Math.min(p.w - RIGHT, Math.max(INSET, p.x));
    const y = Math.min(p.h - BOTTOM, Math.max(TOP, p.y));
    const key = `${t.kind}:${Math.round(x / 60)}:${Math.round(y / 60)}`;
    const m = marks.get(key);
    if (m) m.n++;
    else marks.set(key, { kind: t.kind, x, y, a, n: 1, tx: t.x, ty: t.y });
  }
  if (!marks.size) return null;
  const label: Record<Kind, string> = { pest: 'Pest', miner: 'Miner stopped', verse: 'A verse is near' };
  return (
    <>
      {[...marks.values()].map((m) => (
        <button
          key={`${m.kind}${m.tx},${m.ty}`}
          class={`edge edge-${m.kind}`}
          style={{ left: `${m.x}px`, top: `${m.y}px` }}
          aria-label={`${label[m.kind]}${m.n > 1 ? ` (${m.n})` : ''}: show me`}
          title={label[m.kind]}
          onClick={() => ui.lookAt(m.tx, m.ty)}
        >
          <i style={{ transform: `rotate(${m.a}rad)` }}>▶</i>
          {m.n > 1 && <span>{m.n}</span>}
        </button>
      ))}
    </>
  );
}

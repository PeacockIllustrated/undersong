// M7-03: rest the mouse on a tile and a small label says what it is, how long the Foreman takes, and what it drops.
// Mouse only: touch has the loupe instead.
import { useEffect, useState } from 'preact/hooks';
import { HOVER } from '../data/touch';
import { inspect } from '../sim/inspect';
import { hoverLines } from '../story/hover';
import type { UiBridge } from './App';

export function HoverLabel({ ui }: { ui: UiBridge }) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => set((n) => n + 1), 100);
    return () => window.clearInterval(id);
  }, []);
  const h = ui.hover;
  if (!h || performance.now() - h.t0 < HOVER.delayMs) return null;
  const info = inspect(ui.game, h.x, h.y);
  if (!info) return null;
  const p = ui.toScreen(h.x, h.y);
  const l = hoverLines(info);
  const left = p.x + HOVER.dx;
  const flip = left > p.w - 200;
  return (
    <div
      class="hover-label"
      style={{
        left: flip ? undefined : `${left}px`,
        right: flip ? `${p.w - p.x + HOVER.dx}px` : undefined,
        top: `${p.y + HOVER.dy}px`,
      }}
    >
      <b>{l.head}</b>
      {l.sub && <span class={l.warn ? 'warn' : ''}>{l.sub}</span>}
    </div>
  );
}

// Phone controls (ADR-H006): a left thumb stick to move, a right pad to aim and dig, and three buttons.
import { useRef } from 'preact/hooks';
import type { Bridge } from './App';

const RADIUS = 46;

function Pad({
  side,
  onMove,
  onEnd,
}: {
  side: 'left' | 'right';
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
}) {
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const knob = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const place = (dx: number, dy: number): void => {
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  return (
    <div
      class={`pad pad-${side}`}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        origin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        if (base.current) {
          base.current.style.left = `${e.clientX - r.left}px`;
          base.current.style.top = `${e.clientY - r.top}px`;
          base.current.classList.add('on');
        }
        place(0, 0);
        onMove(0, 0);
      }}
      onPointerMove={(e) => {
        const o = origin.current;
        if (!o || o.id !== e.pointerId) return;
        let dx = e.clientX - o.x;
        let dy = e.clientY - o.y;
        const len = Math.hypot(dx, dy);
        if (len > RADIUS) {
          dx = (dx / len) * RADIUS;
          dy = (dy / len) * RADIUS;
        }
        place(dx, dy);
        onMove(dx / RADIUS, dy / RADIUS);
      }}
      onPointerUp={() => {
        origin.current = null;
        base.current?.classList.remove('on');
        onEnd();
      }}
      onPointerCancel={() => {
        origin.current = null;
        base.current?.classList.remove('on');
        onEnd();
      }}
    >
      <div class="pad-base" ref={base}>
        <div class="pad-knob" ref={knob} />
      </div>
      <span class="pad-label">{side === 'left' ? 'Move' : 'Aim and dig'}</span>
    </div>
  );
}

export function TouchControls({ bridge }: { bridge: Bridge }) {
  const inp = bridge.input;
  const t = inp.touch;
  const d = bridge.g.day;
  return (
    <div class="touch">
      <Pad
        side="left"
        onMove={(x, y) => {
          inp.usingTouch = true;
          t.stick = { x, y };
        }}
        onEnd={() => {
          t.stick = null;
        }}
      />
      <Pad
        side="right"
        onMove={(x, y) => {
          inp.usingTouch = true;
          // a light touch with no push yet aims the way the Foreman faces
          t.aim = Math.hypot(x, y) < 0.15 ? { x: (d?.body.facing ?? 1) * 1, y: 0.2 } : { x, y };
        }}
        onEnd={() => {
          t.aim = null;
        }}
      />
      <div class="touch-btns">
        <button
          class="tbtn"
          onPointerDown={(e) => {
            e.preventDefault();
            inp.usingTouch = true;
            inp.pressLadder();
          }}
        >
          Ladder
          <small>{d?.ladders ?? 0}</small>
        </button>
        <button
          class="tbtn"
          onPointerDown={(e) => {
            e.preventDefault();
            inp.usingTouch = true;
            inp.pressThrow();
          }}
        >
          Charge
          <small>{d?.charges ?? 0}</small>
        </button>
        <button
          class="tbtn jump"
          onPointerDown={(e) => {
            e.preventDefault();
            inp.usingTouch = true;
            inp.pressJump();
            t.jump = true;
          }}
          onPointerUp={() => {
            t.jump = false;
          }}
          onPointerCancel={() => {
            t.jump = false;
          }}
        >
          Jump
        </button>
      </div>
    </div>
  );
}

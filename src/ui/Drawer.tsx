// M13-07: one panel frame for the Village, the Survey Book and the Menu. A side drawer on a wide screen, a bottom
// sheet with a grab handle on a phone. Switching between them keeps the frame; the mine stays live beside it.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { reducedMotion } from '../settings';
import { DRAWER } from '../data/ui';
import { DRAWER_TEXT } from '../story/qol';

export type Section = 'village' | 'survey' | 'menu';

/** A sticky row of tabs under the drawer's head. */
export function Tabs<T extends string>({
  label,
  tabs,
  on,
  set,
  end,
}: {
  label: string;
  tabs: readonly { id: T; label: string; n?: number; isNew?: boolean }[];
  on: T;
  set: (t: T) => void;
  /** Something to sit at the end of the row, such as the ×1 / ×10 / Max toggle. */
  end?: ComponentChildren;
}) {
  return (
    <div class="drawer-sub">
      {tabs.length > 1 && (
        <div class="tabs" role="tablist" aria-label={label}>
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={on === t.id}
              class={on === t.id ? 'on' : ''}
              onClick={() => set(t.id)}
            >
              {t.label}
              {t.isNew && <span class="pip">NEW</span>}
              {!!t.n && <span class="count">{t.n}</span>}
            </button>
          ))}
        </div>
      )}
      {end}
    </div>
  );
}

export function Drawer({
  section,
  go,
  close,
  badges,
  children,
}: {
  section: Section;
  go: (s: Section) => void;
  close: () => void;
  /** Whether each section has something new, for a dot on its name. */
  badges: Partial<Record<Section, boolean>>;
  children: ComponentChildren;
}) {
  const [full, setFull] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<{ y: number; id: number } | null>(null);
  const body = useRef<HTMLDivElement>(null);

  const shut = (): void => {
    if (reducedMotion()) return close();
    setLeaving(true);
    window.setTimeout(close, DRAWER.outMs);
  };
  // the close button, Esc and the backdrop all go through the slide-out
  useEffect(() => {
    const on = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      shut();
    };
    window.addEventListener('keydown', on, true);
    return () => window.removeEventListener('keydown', on, true);
  }, []);
  // a new section starts at its top
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [section]);

  // phone: drag the handle (or the head) up for full height, down for half, further down to close
  const down = (e: PointerEvent): void => {
    if ((e.target as HTMLElement).closest('button')) return;
    start.current = { y: e.clientY, id: e.pointerId };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // no live pointer to hold (a synthetic event): the window listeners still end it
    }
  };
  const move = (e: PointerEvent): void => {
    if (start.current?.id !== e.pointerId) return;
    setDrag(e.clientY - start.current.y);
  };
  const up = (e: PointerEvent): void => {
    if (start.current?.id !== e.pointerId) return;
    const dy = e.clientY - start.current.y;
    start.current = null;
    setDrag(0);
    if (Math.abs(dy) < 6) return setFull(!full);
    if (dy < -DRAWER.snapPx) setFull(true);
    else if (dy > DRAWER.snapPx) {
      if (full) setFull(false);
      else shut();
    }
  };

  const nav: { id: Section; label: string }[] = [
    { id: 'village', label: DRAWER_TEXT.village },
    { id: 'survey', label: DRAWER_TEXT.survey },
    { id: 'menu', label: DRAWER_TEXT.menu },
  ];
  return (
    // the wrap lets taps through, so the mine stays live beside (or above) the panel
    <div class={`drawer-wrap ${leaving ? 'leaving' : ''}`}>
      <aside
        class={`drawer ${section} ${full ? 'full' : ''} ${drag ? 'dragging' : ''}`}
        role="dialog"
        aria-label={nav.find((n) => n.id === section)!.label}
        style={drag > 0 ? { transform: `translateY(${drag}px)` } : undefined}
      >
        <header
          class="drawer-head"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <div class="grab" aria-hidden="true" />
          <nav class="drawer-nav" aria-label={DRAWER_TEXT.nav}>
            {nav.map((n) => (
              <button
                key={n.id}
                class={section === n.id ? 'on' : ''}
                aria-current={section === n.id ? 'page' : undefined}
                onClick={() => go(n.id)}
              >
                {n.label}
                {badges[n.id] && section !== n.id && <i class="dot" aria-label={DRAWER_TEXT.newThings} />}
              </button>
            ))}
          </nav>
          <button class="drawer-x" onClick={shut} aria-label={DRAWER_TEXT.close} title={DRAWER_TEXT.closeKey}>
            ✕
          </button>
        </header>
        <div class="drawer-body" ref={body}>
          {children}
        </div>
      </aside>
    </div>
  );
}

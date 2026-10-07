// Resource chips (polish item 8): the current biome's resources first, a rate per minute, a flash on gain,
// and everything else in a grouped tray behind a +N chip.
import { useState } from 'preact/hooks';
import { BIOME_RES } from '../data/biomes';
import { RES_NAMES, type ResKey } from '../data/resources';
import type { GameState } from '../sim/state';
import { spriteURL } from '../render/sprites';
import { RES_ICON } from './icons';
import { fmt, num } from './format';
import { RES_COLOUR } from '../data/ui';

/** M8-06: the chip whose name and rate are showing (one at a time), and when it was opened. */
let told: ResKey | null = null;
const group = (k: ResKey): number => (BARS.includes(k) ? 0 : ORE.includes(k) ? 1 : 2);

const BARS: readonly ResKey[] = ['copperBar', 'tinBar', 'bronzeBar', 'ironBar', 'silverBar', 'goldBar'];
const ORE: readonly ResKey[] = [
  'copperOre',
  'tinOre',
  'ironOre',
  'silverOre',
  'aquamarine',
  'crystal',
  'emberOre',
  'goldOre',
  'heartstone',
];
const OTHER: readonly ResKey[] = ['spores', 'lumen', 'rubble', 'brick', 'barley', 'timber'];
const ORDER = [...BARS, ...ORE, ...OTHER];

/** UI-only history for rates and flashes: real time, sampled whenever the HUD draws. */
const hist = new Map<ResKey, { t: number; v: number }[]>();
const flashUntil = new Map<ResKey, number>();
const RATE_WINDOW_MS = 60_000;

function sample(k: ResKey, v: number, now: number): void {
  const h = hist.get(k) ?? [];
  const last = h[h.length - 1];
  if (last && v > last.v) flashUntil.set(k, now + 450);
  if (!last || now - last.t >= 1000) h.push({ t: now, v });
  else last.v = v;
  while (h.length > 2 && now - h[0]!.t > RATE_WINDOW_MS) h.shift();
  hist.set(k, h);
}

/** Net gain per minute over the last minute, or 0 when falling or too new to tell. */
function rate(k: ResKey): number {
  const h = hist.get(k);
  if (!h || h.length < 2) return 0;
  const a = h[0]!;
  const b = h[h.length - 1]!;
  const mins = (b.t - a.t) / 60_000;
  return mins > 0.1 && b.v > a.v ? (b.v - a.v) / mins : 0;
}

const TRAY_KEY = 'undersong.tray';
function loadTray(): boolean {
  try {
    return localStorage.getItem(TRAY_KEY) === '1';
  } catch {
    return false;
  }
}

function Chip({ k, s, now, gap }: { k: ResKey; s: GameState; now: number; gap?: boolean }) {
  const [, set] = useState(0);
  const r = rate(k);
  const up = (flashUntil.get(k) ?? 0) > now;
  const c = RES_COLOUR[k];
  return (
    <button
      class={`panel chip ${up ? 'up' : ''} ${gap ? 'gap' : ''} ${told === k ? 'told' : ''}`}
      style={c ? { borderLeftColor: c } : undefined}
      aria-label={`${RES_NAMES[k]}: ${fmt(s.res[k])}`}
      onClick={() => {
        told = told === k ? null : k;
        set((n) => n + 1);
      }}
    >
      <img src={spriteURL(RES_ICON[k])} alt="" />
      {fmt(s.res[k])}
      {r >= 1 && <small class="rate">+{Math.round(r)}/m</small>}
      <span class="tell" role="tooltip">
        {RES_NAMES[k]}
        {r > 0 ? ` · +${num(r)} a minute` : ' · none coming in'}
      </span>
    </button>
  );
}

export function ResChips({ s, biome, wide }: { s: GameState; biome: number; wide: boolean }) {
  const [open, setOpen] = useState(loadTray);
  const now = performance.now();
  const held = ORDER.filter((k) => s.res[k].gt(0) && (k !== 'rubble' || s.buildings.kiln > 0));
  for (const k of held) sample(k, s.res[k].toNumber(), now);
  const head = (BIOME_RES[biome] ?? []).filter((k) => held.includes(k));
  const room = wide ? 7 : 2;
  // ore and bars stay together: the biome's own first, then the shown chips sorted bars, ore, the rest
  const shown = [...head, ...held.filter((k) => !head.includes(k))]
    .slice(0, room)
    .sort((a, b) => group(a) - group(b));
  const rest = held.filter((k) => !shown.includes(k));
  const toggle = (): void => {
    setOpen(!open);
    try {
      localStorage.setItem(TRAY_KEY, open ? '0' : '1');
    } catch {
      /* private mode: the tray just won't remember */
    }
  };
  return (
    <div class="res">
      {s.echoes.gt(0) && (
        <div class="panel chip echo" title="Echoes">
          <img src={spriteURL('echo')} alt="" />
          {fmt(s.echoes)}
        </div>
      )}
      {shown.map((k, i) => (
        <Chip key={k} k={k} s={s} now={now} gap={i > 0 && group(k) !== group(shown[i - 1]!)} />
      ))}
      {rest.length > 0 && (
        <button
          class={`panel chip more ${rest.some((k) => (flashUntil.get(k) ?? 0) > now) ? 'up' : ''}`}
          aria-expanded={open}
          onClick={toggle}
        >
          +{rest.length} {open ? '▴' : '▾'}
        </button>
      )}
      {open && rest.length > 0 && (
        <div class="panel tray">
          {(
            [
              ['Bars', BARS],
              ['Ore', ORE],
              ['Other', OTHER],
            ] as const
          ).map(([label, keys]) => {
            const ks = rest.filter((k) => keys.includes(k));
            if (!ks.length) return null;
            return (
              <div class="tray-row" key={label}>
                <span class="tray-label">{label}</span>
                {ks.map((k) => (
                  <Chip key={k} k={k} s={s} now={now} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

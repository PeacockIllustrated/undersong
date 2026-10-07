// M13: the key list and the Lately list (Menu pages), and the pinned goal on the HUD.
import { useEffect, useRef, useState } from 'preact/hooks';
import { KEYS_TEXT, LATELY_TEXT, PIN_TEXT } from '../story/qol';
import { lately } from './lately';
import { onPin, pinCost, pinPlace, pinShare, pinned, setPin } from './pin';
import { canPay } from '../sim/economy';
import { readyText } from '../story/shop';
import { readyIn } from './rates';
import { spriteURL } from '../render/sprites';
import { toast } from './feedback';
import type { UiBridge } from './App';
import type { VillageTab } from './Village';

export function KeysList() {
  return (
    <>
      <table class="keys">
        <tbody>
          {KEYS_TEXT.rows.map(([k, what]) => (
            <tr key={k}>
              <th>
                <kbd>{k}</kbd>
              </th>
              <td>{what}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p class="small">{KEYS_TEXT.holdHint}</p>
    </>
  );
}

export function LatelyList() {
  const [, set] = useState(0);
  useEffect(() => {
    // "how long ago" moves on while the list is open
    const id = window.setInterval(() => set((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);
  const lines = lately();
  const now = Date.now();
  if (!lines.length) return <p class="small">{LATELY_TEXT.empty}</p>;
  return (
    <>
      <ol class="lately">
        {lines.map((l, i) => (
          <li key={`${l.at}-${i}`}>
            <span class="when small">{LATELY_TEXT.ago(now - l.at)}</span>
            <b>{l.big}</b>
            {l.sub && <span class="small"> · {l.sub}</span>}
          </li>
        ))}
      </ol>
      <p class="small">{LATELY_TEXT.note}</p>
    </>
  );
}

/** M13-04: the pinned goal on the HUD, with a bar for how much of its price is in hand. */
export function PinChip({ ui, open }: { ui: UiBridge; open: (tab: VillageTab, card: string) => void }) {
  const [, set] = useState(0);
  useEffect(() => onPin(() => set((n) => n + 1)), []);
  const p = pinned();
  const s = ui.game.state;
  const c = p ? pinCost(s, p.id) : null;
  const ok = !!c && canPay(s, c);
  const was = useRef<{ id: string; ok: boolean } | null>(null);
  useEffect(() => {
    // bought, or no longer offered: the pin clears itself
    if (p && !c) setPin(null);
    if (!p || !c) return void (was.current = null);
    // repeatable buys come round again and again; only a one-off goal gets a toast
    if (was.current?.id === p.id && !was.current.ok && ok && !p.id.startsWith('k:'))
      toast(PIN_TEXT.readyToast(p.name), PIN_TEXT.readyToastSub);
    was.current = { id: p.id, ok };
  });
  if (!p || !c) return null;
  const share = pinShare(s, c);
  const place = pinPlace(p.id);
  return (
    <button
      class={`panel pin-chip ${ok ? 'ready' : ''}`}
      title={PIN_TEXT.chipTitle}
      onClick={() => open(place.tab, place.card)}
    >
      <img src={spriteURL('icon-pin')} alt="" />
      <span class="pname">{p.name}</span>
      <span class="pbar" aria-hidden="true">
        <i style={{ width: `${Math.round(share * 100)}%` }} />
      </span>
      <span class="pwhen">{ok ? PIN_TEXT.ready : readyText(readyIn(c, s))}</span>
    </button>
  );
}

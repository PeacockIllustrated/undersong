// Save, export, import and start over.
import { useState } from 'preact/hooks';
import { exportString, importString } from '../save/codec';
import type { UiBridge } from './App';

export function MenuSheet({ ui, close }: { ui: UiBridge; close: () => void }) {
  const [out, setOut] = useState('');
  const [inp, setInp] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const doExport = (): void => {
    const s = exportString(ui.game.state);
    setOut(s);
    navigator.clipboard?.writeText(s).then(
      () => setMsg({ ok: true, text: 'Copied to the clipboard.' }),
      () => setMsg({ ok: true, text: 'Select the text below to copy it.' }),
    );
  };
  const doImport = (): void => {
    try {
      const st = importString(inp);
      ui.replace(st);
      setMsg({ ok: true, text: 'Save loaded.' });
      setInp('');
    } catch (e) {
      setMsg({
        ok: false,
        text: `Could not load that save. ${(e as Error).message} Your current game is unchanged.`,
      });
    }
  };

  return (
    <div class="sheet-wrap" onClick={(e) => e.target === e.currentTarget && close()}>
      <div class="panel sheet" role="dialog" aria-label="Menu">
        <h2>Menu</h2>
        <p>The game saves itself every 30 seconds and whenever you leave.</p>
        <div class="row">
          <button class="btn primary" onClick={() => (ui.save(), setMsg({ ok: true, text: 'Saved.' }))}>
            Save now
          </button>
          <button class="btn" onClick={doExport}>
            Export save
          </button>
        </div>
        {out && <textarea readOnly value={out} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />}
        <p style={{ marginTop: '14px' }}>Paste an exported save to load it.</p>
        <textarea id="import" value={inp} onInput={(e) => setInp((e.target as HTMLTextAreaElement).value)} />
        <div class="row">
          <button class="btn" disabled={!inp.trim()} onClick={doImport}>
            Import save
          </button>
          {!confirmWipe ? (
            <button class="btn danger" onClick={() => setConfirmWipe(true)}>
              Start over
            </button>
          ) : (
            <button
              class="btn danger"
              onClick={() => {
                ui.wipe();
                close();
              }}
            >
              Erase everything
            </button>
          )}
        </div>
        {msg && <div class={msg.ok ? 'ok' : 'err'}>{msg.text}</div>}
        <p class="small">
          Controls: tap rock to dig it, drag from rock to dig a path (on touch, press and hold first). Drag
          empty space, scroll, or use WASD to look around.
        </p>
        <div class="row end">
          <button class="btn" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

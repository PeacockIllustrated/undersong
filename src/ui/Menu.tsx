// Save, export, import and start over.
import { useState } from 'preact/hooks';
import { exportString, importString, saveFileName, saveSummary } from '../save/codec';
import type { GameState } from '../sim/state';
import { fmt } from './format';
import type { UiBridge } from './App';
import { SettingsPanel } from './Settings';
import { SETTINGS_TEXT } from '../story/settings';
import { KEYS_TEXT, LATELY_TEXT, MENU_TABS } from '../story/qol';
import { Tabs } from './Drawer';
import { KeysList, LatelyList } from './Qol';

export type MenuView = 'menu' | 'settings' | 'keys' | 'lately';

export function MenuSheet({
  ui,
  close,
  start = 'menu',
}: {
  ui: UiBridge;
  close: () => void;
  start?: MenuView;
}) {
  const [out, setOut] = useState('');
  const [inp, setInp] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  /** M12-01: a checked save waiting for the player to say yes. */
  const [pending, setPending] = useState<GameState | null>(null);
  const [view, setView] = useState<MenuView>(start);

  const doExport = (): void => {
    const s = exportString(ui.game.state);
    setOut(s);
    navigator.clipboard?.writeText(s).then(
      () => setMsg({ ok: true, text: 'Copied to the clipboard.' }),
      () => setMsg({ ok: true, text: 'Select the text below to copy it.' }),
    );
  };
  const doDownload = (): void => {
    const blob = new Blob([exportString(ui.game.state)], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = saveFileName(new Date());
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg({ ok: true, text: `Downloaded ${a.download}.` });
  };
  /** Check the text first; nothing changes until the player confirms. */
  const doCheck = (text: string): void => {
    try {
      setPending(importString(text));
      setMsg(null);
    } catch (e) {
      setPending(null);
      setMsg({
        ok: false,
        text: `Could not load that save. ${(e as Error).message} Your current game is unchanged.`,
      });
    }
  };
  const doFile = (f: File | undefined): void => {
    if (!f) return;
    f.text().then(
      (t) => (setInp(t.trim()), doCheck(t)),
      () => setMsg({ ok: false, text: 'Could not read that file. Your current game is unchanged.' }),
    );
  };
  const doLoad = (): void => {
    if (!pending) return;
    ui.replace(pending);
    setPending(null);
    setInp('');
    setMsg({ ok: true, text: 'Save loaded.' });
  };

  const tabs: { id: MenuView; label: string }[] = [
    { id: 'menu', label: MENU_TABS.game },
    { id: 'settings', label: SETTINGS_TEXT.title },
    { id: 'lately', label: LATELY_TEXT.title },
    { id: 'keys', label: KEYS_TEXT.title },
  ];
  return (
    <>
      <Tabs label="Menu" tabs={tabs} on={view} set={setView} />
      {view === 'settings' && (
        <div class="pad">
          <SettingsPanel ui={ui} />
          <p class="small">{SETTINGS_TEXT.note}</p>
        </div>
      )}
      {view === 'lately' && (
        <div class="pad">
          <LatelyList />
        </div>
      )}
      {view === 'keys' && (
        <div class="pad">
          <KeysList />
        </div>
      )}
      {view === 'menu' && (
        <div class="pad">
          <p>The game saves itself every 30 seconds and whenever you leave.</p>
          <div class="row">
            <button class="btn primary" onClick={() => (ui.save(), setMsg({ ok: true, text: 'Saved.' }))}>
              Save now
            </button>
            <button class="btn" onClick={doExport}>
              Copy save
            </button>
            <button class="btn" onClick={doDownload}>
              Download save
            </button>
          </div>
          {out && (
            <textarea readOnly value={out} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />
          )}
          <p style={{ marginTop: '14px' }}>Paste a copied save, or open a downloaded one, to load it.</p>
          <textarea
            id="import"
            value={inp}
            onInput={(e) => (setInp((e.target as HTMLTextAreaElement).value), setPending(null))}
          />
          {pending ? (
            <div class="confirm-load">
              <p>
                {((p) =>
                  `This save is on cycle ${p.cycle}, ${p.bestFt.toLocaleString('en-GB')} ft at its deepest, with ${fmt(p.echoes)} Echoes and ${p.verses} of 12 verses. Loading it replaces the game you are playing now.`)(
                  saveSummary(pending),
                )}
              </p>
              <div class="row">
                <button class="btn primary" onClick={doLoad}>
                  Load this save
                </button>
                <button class="btn" onClick={() => setPending(null)}>
                  Keep my game
                </button>
              </div>
            </div>
          ) : null}
          <div class="row">
            <button class="btn" disabled={!inp.trim() || !!pending} onClick={() => doCheck(inp)}>
              Import save
            </button>
            <label class="btn file-btn">
              Open a file
              <input
                type="file"
                accept=".txt,.json,text/plain,application/json"
                onChange={(e) => {
                  const el = e.target as HTMLInputElement;
                  doFile(el.files?.[0]);
                  el.value = '';
                }}
              />
            </label>
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
            empty space, scroll, or use WASD to look around. Hold a buy button to keep buying.
          </p>
        </div>
      )}
    </>
  );
}

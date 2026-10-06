// The HUD and menus. Reads the game, dispatches actions; never mutates state directly.
import { useEffect, useState } from 'preact/hooks';
import { biomeAt } from '../data/biomes';
import { ftFromDepthTiles } from '../data/constants';
import { RES_KEYS, RES_NAMES } from '../data/resources';
import type { Action } from '../sim/actions';
import type { Game } from '../sim/game';
import type { GameState } from '../sim/state';
import { exportString, importString } from '../save/codec';
import { spriteURL } from '../render/sprites';
import { RES_ICON } from './icons';
import { fmt } from './format';

export interface UiBridge {
  readonly game: Game;
  dispatch(a: Action): void;
  save(): void;
  replace(s: GameState | null): void;
  wipe(): void;
  recenter(): void;
}

function useTick(ms: number): void {
  const [, set] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => set((n) => n + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

export function App({ ui }: { ui: UiBridge }) {
  useTick(200);
  const [sheet, setSheet] = useState<null | 'menu'>(null);
  const g = ui.game;
  const s = g.state;
  const d = g.world.depth(s.foreman.y);
  const biome = biomeAt(d);
  const held = RES_KEYS.filter((k) => s.res[k].gt(0));

  return (
    <>
      <div class="hud-top">
        <div class="panel depth" aria-live="polite">
          <div class="ft">{ftFromDepthTiles(d)} ft</div>
          <div class="biome">
            {d < 1 ? 'Holloway' : biome.name} · deepest {ftFromDepthTiles(s.stats.maxDepthD)} ft
          </div>
        </div>
        <div class="res">
          {held.map((k) => (
            <div class="panel chip" key={k} title={RES_NAMES[k]}>
              <img src={spriteURL(RES_ICON[k])} alt="" />
              {fmt(s.res[k])}
            </div>
          ))}
        </div>
      </div>
      <div class="hud-bottom">
        {s.stats.tilesMined < 3 ? (
          <div class="panel hint">
            Tap rock beside the shaft to dig. Drag from a rock to dig a whole path.
          </div>
        ) : (
          <span />
        )}
        <div class="row" style={{ margin: 0 }}>
          <button class="btn" onClick={() => ui.recenter()}>
            Foreman
          </button>
          <button class="btn" onClick={() => setSheet('menu')}>
            Menu
          </button>
        </div>
      </div>
      {sheet === 'menu' && <MenuSheet ui={ui} close={() => setSheet(null)} />}
    </>
  );
}

function MenuSheet({ ui, close }: { ui: UiBridge; close: () => void }) {
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
        <div class="row" style={{ justifyContent: 'flex-end' }}>
          <button class="btn" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Story on screen: village lines as speech, verses as cards, the Cave-in as a collapse.
import { useEffect, useState } from 'preact/hooks';
import { LINES, SPEAKER_NAME } from '../story/lines';
import { VERSES } from '../story/verses';
import { RES_NAMES } from '../data/resources';
import { spriteURL } from '../render/sprites';
import type { UiBridge } from './App';

const PORTRAIT: Record<string, string> = { pell: 'pell', bram: 'bram', wren: 'wren', foreman: 'foreman' };

export function StoryLayer({ ui }: { ui: UiBridge }) {
  const ev = ui.game.state.story.events[0];
  const [shownAt, setShownAt] = useState(0);
  const [cave, setCave] = useState(0);

  useEffect(() => {
    if (!ev) return;
    setShownAt(performance.now());
    if (ev.kind === 'line' || ev.kind === 'chest') {
      const id = window.setTimeout(() => ui.dispatch({ type: 'ackStory' }), ev.kind === 'line' ? 7000 : 3500);
      return () => window.clearTimeout(id);
    }
    if (ev.kind === 'caveIn') {
      setCave(1);
      const a = window.setTimeout(() => setCave(2), 1600);
      const b = window.setTimeout(() => {
        setCave(0);
        ui.dispatch({ type: 'ackStory' });
        window.dispatchEvent(new Event('undersong:cavein-done'));
      }, 4200);
      return () => (window.clearTimeout(a), window.clearTimeout(b));
    }
    if (ev.kind !== 'verse') ui.dispatch({ type: 'ackStory' });
    return undefined;
  }, [ev]);
  void shownAt;

  if (cave)
    return (
      <div class={`collapse stage${cave}`} aria-live="assertive">
        {cave === 2 && <p>The mountain settles. The village forgets.</p>}
      </div>
    );
  if (!ev) return null;
  if (ev.kind === 'line') {
    const line = LINES[ev.id];
    if (!line) return null;
    return (
      <button class="speech panel" onClick={() => ui.dispatch({ type: 'ackStory' })} aria-live="polite">
        <img src={spriteURL(PORTRAIT[line.who] ?? 'pell')} alt="" />
        <span>
          <b>{SPEAKER_NAME[line.who]}</b>
          {line.text}
        </span>
      </button>
    );
  }
  if (ev.kind === 'chest')
    return (
      <div class="speech panel toast" aria-live="polite">
        <img src={spriteURL('obj-chest')} alt="" />
        <span>
          <b>An old chest</b>
          {ev.n} {RES_NAMES[ev.res].toLowerCase()}
          {Number(ev.n) > 1 && !RES_NAMES[ev.res].endsWith('s') ? 's' : ''}, wrapped in oilcloth.
        </span>
      </div>
    );
  if (ev.kind === 'verse') {
    const v = VERSES[ev.verse]!;
    return (
      <div class="sheet-wrap verse-wrap">
        <div class="verse-card" role="dialog" aria-label={`Verse ${v.n}`}>
          <div class="verse-n">Verse {v.n}</div>
          <p class="verse-text">
            {v.lines[0]}
            <br />
            {v.lines[1]}
          </p>
          <div class="verse-sub">
            {ev.again ? 'You knew it before you read it.' : `Carved into the rock of the ${v.biome}.`}
          </div>
          <button class="btn primary" onClick={() => ui.dispatch({ type: 'ackStory' })}>
            Keep digging
          </button>
        </div>
      </div>
    );
  }
  return null;
}

// Story on screen: village lines as speech, verses as cards, the Cave-in as a collapse.
import { useEffect, useState } from 'preact/hooks';
import { LINES, SPEAKER_NAME } from '../story/lines';
import { VERSES } from '../story/verses';
import { RES_NAMES } from '../data/resources';
import { spriteURL } from '../render/sprites';
import type { UiBridge } from './App';
import { RES_ICON } from './icons';
import { VERSE_CACHE, VERSE_POWER } from '../data/helpers';
import { ECHO } from '../data/economy';
import { nextTip } from '../story/tips';
import { CHOICE, SCENES, SUNG_BACK } from '../story/ending';
import { endingReady } from '../sim/ending';

const PORTRAIT: Record<string, string> = { pell: 'pell', bram: 'bram', wren: 'wren', foreman: 'foreman' };

export function StoryLayer({ ui, tips = true }: { ui: UiBridge; tips?: boolean }) {
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
    if (ev.kind !== 'verse' && ev.kind !== 'ending') ui.dispatch({ type: 'ackStory' });
    return undefined;
  }, [ev]);
  void shownAt;

  if (cave)
    return (
      <div class={`collapse stage${cave}`} aria-live="assertive">
        {cave === 2 && <p>The mountain settles. The village forgets.</p>}
      </div>
    );
  if (!ev) return tips ? <TipCard ui={ui} /> : null;
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
    const cache = VERSE_CACHE[ev.verse]!;
    // New Song+ (ADR-023): the verses come back sung, their lines the other way round
    const song = ui.game.state.ngPlus > 0;
    return (
      <div class="sheet-wrap verse-wrap">
        <div class="verse-card" role="dialog" aria-label={`Verse ${v.n}`}>
          <div class="verse-n">Verse {v.n}</div>
          <ul class="loot">
            <li>
              <img src={spriteURL(RES_ICON[cache.res])} alt="" />+{cache.n}{' '}
              {RES_NAMES[cache.res].toLowerCase()}s
            </li>
            {!ev.again && <li class="gold">+{Math.round(VERSE_POWER * 100)}% to all work, forever</li>}
            <li>+{Math.round(ECHO.perVerse * 100)}% Echoes at this Cave-in</li>
          </ul>
          <p class="verse-text">
            {song ? v.lines[1] : v.lines[0]}
            <br />
            {song ? v.lines[0] : v.lines[1]}
          </p>
          <div class="verse-sub">
            {song
              ? SUNG_BACK
              : ev.again
                ? 'You knew it before you read it.'
                : `Carved into the rock of the ${v.biome}.`}
          </div>
          <button class="btn primary" onClick={() => ui.dispatch({ type: 'ackStory' })}>
            Keep digging
          </button>
        </div>
      </div>
    );
  }
  if (ev.kind === 'ending') {
    const sc = SCENES[ev.which];
    return (
      <div class={`sheet-wrap ending-wrap ${ev.which}`}>
        <div class="ending-card" role="dialog" aria-label={sc.title}>
          <h2>{sc.title}</h2>
          {sc.lines.map((l, i) => (
            <p key={i} style={{ animationDelay: `${0.6 + i * 1.4}s` }}>
              {l}
            </p>
          ))}
          <button
            class="btn primary"
            style={{ animationDelay: `${0.6 + sc.lines.length * 1.4}s` }}
            onClick={() => ui.dispatch({ type: 'ackStory' })}
          >
            {sc.button}
          </button>
        </div>
      </div>
    );
  }
  return null;
}

/** At the Hollow Heart with Verse XII sung: the choice. Waits behind any story still showing. */
export function EndingChoice({ ui }: { ui: UiBridge }) {
  const s = ui.game.state;
  if (!endingReady(s) || s.story.events.length) return null;
  const pick = (which: 'seal' | 'sing'): void => ui.dispatch({ type: 'chooseEnding', which });
  return (
    <div class="sheet-wrap ending-wrap choice">
      <div class="ending-card" role="dialog" aria-label={CHOICE.title}>
        <h2>{CHOICE.title}</h2>
        <p class="still">{CHOICE.intro}</p>
        <div class="choices">
          {(['seal', 'sing'] as const).map((k) => (
            <button key={k} class={`choice ${k}`} onClick={() => pick(k)}>
              <b>{CHOICE[k].label}</b>
              <span>{CHOICE[k].text}</span>
              <i>{CHOICE[k].unlocks}</i>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Polish item 4: a tip card, queued behind the story so two never stack. Shown once ever per system. */
function TipCard({ ui }: { ui: UiBridge }) {
  const tip = nextTip(ui.game.state);
  if (!tip) return null;
  const seen = (): void => ui.dispatch({ type: 'note', key: `tip:${tip.id}` });
  const show = (): void => {
    if (tip.show === 'water') {
      const g = ui.game;
      const i = [...g.wet][0];
      if (i !== undefined) ui.lookAt(i % g.world.w, Math.floor(i / g.world.w));
    } else if (tip.show) window.dispatchEvent(new CustomEvent('undersong:village', { detail: tip.show }));
    seen();
  };
  return (
    <div class="tip panel" role="status" aria-live="polite">
      <b>{tip.title}</b>
      <span>{tip.text}</span>
      <div class="row">
        {tip.show && (
          <button class="btn" onClick={show}>
            Show me
          </button>
        )}
        <button class="btn primary" onClick={seen}>
          Got it
        </button>
      </div>
    </div>
  );
}

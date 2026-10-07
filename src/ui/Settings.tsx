// Settings (M5-01, ADR-024): motion, text size, shape marks, sound and number style. Saved apart from the game.
import { useEffect, useState } from 'preact/hooks';
import { TEXT_SCALES, onSettings, reducedMotion, setSettings, settings, type Settings } from '../settings';
import { SETTINGS_TEXT } from '../story/settings';
import { SOUND_LEVELS } from '../data/sounds';
import { AUTO_CAVEIN } from '../data/beyond';
import { autoOffered } from '../sim/beyond';
import { AUTO_TEXT } from '../story/beyond';
import type { UiBridge } from './App';

/** Puts the current settings on the page root: data-motion for CSS, --ts for text size. */
export function useApplySettings(): void {
  useEffect(() => {
    const root = document.documentElement;
    const apply = (): void => {
      root.dataset.motion = reducedMotion() ? 'reduced' : 'full';
      root.style.setProperty('--ts', String(settings().textScale));
    };
    apply();
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', apply);
    const off = onSettings(apply);
    return () => {
      mq.removeEventListener('change', apply);
      off();
    };
  }, []);
}

function Choice<T extends string | number | boolean>({
  label,
  hint,
  value,
  options,
  set,
}: {
  label: string;
  hint: string;
  value: T;
  options: readonly (readonly [T, string])[];
  set: (v: T) => void;
}) {
  return (
    <div class="setting">
      <div class="setting-head">
        <b>{label}</b>
        <span class="small">{hint}</span>
      </div>
      <div class="seg" role="radiogroup" aria-label={label}>
        {options.map(([v, name]) => (
          <button
            key={String(v)}
            class={`btn ${v === value ? 'primary' : ''}`}
            role="radio"
            aria-checked={v === value}
            onClick={() => set(v)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsPanel({ ui }: { ui?: UiBridge }) {
  const [s, setS] = useState<Settings>(settings());
  const [, setTick] = useState(0);
  useEffect(() => onSettings(setS), []);
  const t = SETTINGS_TEXT;
  return (
    <div class="settings">
      <Choice
        label={t.motion.label}
        hint={t.motion.hint}
        value={s.motion}
        options={[
          ['auto', t.motion.auto],
          ['full', t.motion.full],
          ['reduced', t.motion.reduced],
        ]}
        set={(motion) => setSettings({ motion })}
      />
      <Choice
        label={t.text.label}
        hint={t.text.hint}
        value={s.textScale}
        options={TEXT_SCALES.map((v, i) => [v, t.text.sizes[i]!] as const)}
        set={(textScale) => setSettings({ textScale })}
      />
      <Choice
        label={t.marks.label}
        hint={t.marks.hint}
        value={s.marks}
        options={[
          [true, t.on],
          [false, t.off],
        ]}
        set={(marks) => setSettings({ marks })}
      />
      <Choice
        label={t.sound.label}
        hint={t.sound.hint}
        value={s.sound}
        options={SOUND_LEVELS.map((v, i) => [v as number, t.levels[i]!] as const)}
        set={(sound) => setSettings({ sound })}
      />
      <Choice
        label={t.music.label}
        hint={t.music.hint}
        value={s.music}
        options={SOUND_LEVELS.map((v, i) => [v as number, t.levels[i]!] as const)}
        set={(music) => setSettings({ music })}
      />
      <Choice
        label={t.aim.label}
        hint={t.aim.hint}
        value={s.aim}
        options={[
          ['loupe', t.aim.loupe],
          ['crosshair', t.aim.crosshair],
          ['off', t.aim.off],
        ]}
        set={(aim) => setSettings({ aim })}
      />
      <Choice
        label={t.smartDig.label}
        hint={t.smartDig.hint}
        value={s.smartDig}
        options={[
          [true, t.on],
          [false, t.off],
        ]}
        set={(smartDig) => setSettings({ smartDig })}
      />
      <Choice
        label={t.haptics.label}
        hint={t.haptics.hint}
        value={s.haptics}
        options={[
          [true, t.on],
          [false, t.off],
        ]}
        set={(haptics) => setSettings({ haptics })}
      />
      <Choice
        label={t.numbers.label}
        hint={t.numbers.hint}
        value={s.numbers}
        options={[
          ['short', t.numbers.short],
          ['scientific', t.numbers.scientific],
        ]}
        set={(numbers) => setSettings({ numbers })}
      />
      {ui && autoOffered(ui.game.state) && (
        <Choice
          label={AUTO_TEXT.label}
          hint={AUTO_TEXT.hint(AUTO_CAVEIN.stallMs / 60_000)}
          value={ui.game.state.auto.caveIn}
          options={[
            [true, t.on],
            [false, t.off],
          ]}
          set={(on) => (ui.dispatch({ type: 'autoCaveIn', on }), setTick((k) => k + 1))}
        />
      )}
    </div>
  );
}

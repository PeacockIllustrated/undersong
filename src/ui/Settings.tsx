// Settings (M5-01, ADR-024): motion, text size, shape marks and number style. Saved apart from the game.
import { useEffect, useState } from 'preact/hooks';
import { TEXT_SCALES, onSettings, reducedMotion, setSettings, settings, type Settings } from '../settings';
import { SETTINGS_TEXT } from '../story/settings';

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

export function SettingsPanel() {
  const [s, setS] = useState<Settings>(settings());
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
        label={t.numbers.label}
        hint={t.numbers.hint}
        value={s.numbers}
        options={[
          ['short', t.numbers.short],
          ['scientific', t.numbers.scientific],
        ]}
        set={(numbers) => setSettings({ numbers })}
      />
    </div>
  );
}

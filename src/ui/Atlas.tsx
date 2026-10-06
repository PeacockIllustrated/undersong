// Dev route /#atlas: every sprite and frame at ×4 (M0-07).
import { sprite, spriteNames, spriteURL } from '../render/sprites';

export function Atlas() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--display)', padding: '16px 16px 0', margin: 0 }}>Atlas</h1>
      <div class="atlas-grid">
        {spriteNames().map((n) => {
          const s = sprite(n);
          return (
            <div class="atlas-item" key={n}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {s.frames.map((_, f) => (
                  <img
                    key={f}
                    src={spriteURL(n, f)}
                    width={s.doc.w * 4}
                    height={s.doc.h * 4}
                    alt={`${n} frame ${f + 1}`}
                  />
                ))}
              </div>
              <span>
                {n} · {s.doc.w}×{s.doc.h}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

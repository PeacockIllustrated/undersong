// M13: the key list and the Lately list, both shown inside the Menu sheet.
import { useEffect, useState } from 'preact/hooks';
import { KEYS_TEXT, LATELY_TEXT } from '../story/qol';
import { lately } from './lately';

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

// A small toast queue the HUD shows across the top. Any module can raise one.
export type ToastKind = 'info' | 'gold' | 'warn' | 'verse';
export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
  until: number;
}

let next = 1;
let list: Toast[] = [];
const subs = new Set<() => void>();

export function toast(text: string, kind: ToastKind = 'info'): void {
  const ms = kind === 'verse' ? 7000 : 3200;
  // the same message twice in a row only refreshes the first
  const same = list.find((t) => t.text === text);
  if (same) same.until = performance.now() + ms;
  else list = [...list.slice(-3), { id: next++, text, kind, until: performance.now() + ms }];
  subs.forEach((f) => f());
}

export function toasts(now: number): Toast[] {
  list = list.filter((t) => t.until > now);
  return list;
}

export function onToast(f: () => void): () => void {
  subs.add(f);
  return () => subs.delete(f);
}

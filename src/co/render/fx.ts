// Cosmetic effects for a day underground: debris, sparks, jet flame, floating numbers and screen shake. Render only.
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  col: string;
  size: number;
  grav: number;
}
interface Floater {
  x: number;
  y: number;
  text: string;
  col: string;
  t0: number;
  life: number;
  big: boolean;
}

export class Fx {
  private parts: Particle[] = [];
  private floats: Floater[] = [];
  private last = 0;
  private shakeUntil = 0;
  private shakeAmp = 0;
  /** Off for players who asked for less motion. */
  calm = false;

  private push(p: Omit<Particle, 'life'>): void {
    this.parts.push({ ...p, life: 0 });
    if (this.parts.length > 600) this.parts.splice(0, this.parts.length - 600);
  }

  debris(x: number, y: number, cols: readonly string[], n = 8, power = 1): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + i * 0.7;
      this.push({
        x,
        y,
        vx: Math.cos(a) * (24 + (i % 3) * 20) * power,
        vy: (Math.sin(a) * 30 - 50) * power,
        max: 0.45 + (i % 4) * 0.12,
        col: cols[i % cols.length]!,
        size: 1 + (i % 2),
        grav: 260,
      });
    }
  }

  sparkle(x: number, y: number, col: string, n = 6): void {
    for (let i = 0; i < n; i++)
      this.push({
        x: x + ((i * 7) % 11) - 5,
        y,
        vx: ((i * 13) % 9) - 4,
        vy: -18 - i * 3,
        max: 0.9,
        col,
        size: 1,
        grav: 0,
      });
  }

  jet(x: number, y: number, now: number): void {
    for (let i = 0; i < 2; i++)
      this.push({
        x: x + Math.sin(now / 30 + i) * 2,
        y,
        vx: Math.sin(now / 17 + i * 3) * 10,
        vy: 60 + i * 20,
        max: 0.25,
        col: i ? '#FF9A3C' : '#FFD65A',
        size: 2,
        grav: 0,
      });
  }

  float(x: number, y: number, text: string, col: string, now: number, big = false): void {
    // stack floaters that land on the same spot so they never overlap
    const near = this.floats.filter((f) => Math.abs(f.x - x) < 20 && now - f.t0 < 300).length;
    this.floats.push({ x, y: y - near * 9, text, col, t0: now, life: big ? 1700 : 1000, big });
    if (this.floats.length > 60) this.floats.shift();
  }

  shake(now: number): { x: number; y: number } {
    if (this.calm || now > this.shakeUntil) return { x: 0, y: 0 };
    const k = (this.shakeUntil - now) / 400;
    return {
      x: Math.round(Math.sin(now / 17) * this.shakeAmp * k),
      y: Math.round(Math.cos(now / 23) * this.shakeAmp * k),
    };
  }

  kick(amp: number, ms: number, now: number): void {
    if (amp >= this.shakeAmp || now > this.shakeUntil) this.shakeAmp = amp;
    this.shakeUntil = Math.max(this.shakeUntil, now + ms);
  }

  drawWorld(ctx: CanvasRenderingContext2D, now: number): void {
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
    this.last = now;
    for (const p of this.parts) {
      p.life += dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
    this.parts = this.parts.filter((p) => p.life < p.max);
  }

  drawText(ctx: CanvasRenderingContext2D, now: number): void {
    for (const f of this.floats) {
      const t = (now - f.t0) / f.life;
      if (t >= 1) continue;
      ctx.font = f.big ? '10px Silkscreen, monospace' : '8px Silkscreen, monospace';
      const y = Math.round(f.y - t * (f.big ? 26 : 16));
      const w = Math.ceil(ctx.measureText(f.text).width);
      const x = Math.round(f.x - w / 2);
      ctx.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
      ctx.fillStyle = '#141A33';
      ctx.fillText(f.text, x + 1, y + 1);
      ctx.fillStyle = f.col;
      ctx.fillText(f.text, x, y);
    }
    ctx.globalAlpha = 1;
    this.floats = this.floats.filter((f) => now - f.t0 < f.life);
  }
}

// Small cosmetic effects: debris, sparkles, floating text, screen shake. Render-only, never the sim.
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  col: string;
  size: number;
}
interface Floater {
  x: number;
  y: number;
  text: string;
  col: string;
  t0: number;
}

export class Fx {
  private parts: Particle[] = [];
  private floats: Floater[] = [];
  private last = 0;
  shakeUntil = 0;
  shakeAmp = 0;

  debris(x: number, y: number, cols: readonly string[], n = 8): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + i;
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * (20 + (i % 3) * 18),
        vy: Math.sin(a) * 30 - 40,
        life: 0,
        max: 0.5 + (i % 4) * 0.1,
        col: cols[i % cols.length]!,
        size: 1 + (i % 2),
      });
    }
    if (this.parts.length > 400) this.parts.splice(0, this.parts.length - 400);
  }

  sparkle(x: number, y: number, col: string): void {
    this.parts.push({
      x: x + ((this.parts.length * 7) % 9) - 4,
      y,
      vx: 0,
      vy: -12,
      life: 0,
      max: 0.8,
      col,
      size: 1,
    });
  }

  float(x: number, y: number, text: string, col: string, now: number): void {
    this.floats.push({ x, y, text, col, t0: now });
    if (this.floats.length > 30) this.floats.shift();
  }

  shake(amp: number, ms: number, now: number): void {
    this.shakeAmp = amp;
    this.shakeUntil = now + ms;
  }

  /** World-space particles, drawn before the light so they sit in the dark properly. */
  drawWorld(ctx: CanvasRenderingContext2D, now: number): void {
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
    this.last = now;
    this.parts = this.parts.filter((p) => (p.life += dt) < p.max);
    for (const p of this.parts) {
      p.vy += 160 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
  }

  /** Floating numbers above the light, so they always read. */
  drawOverlay(ctx: CanvasRenderingContext2D, now: number): void {
    this.floats = this.floats.filter((f) => now - f.t0 < 1100);
    ctx.font = '8px Silkscreen, monospace';
    ctx.textAlign = 'center';
    for (const f of this.floats) {
      const k = (now - f.t0) / 1100;
      const y = Math.round(f.y - k * 18);
      ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = '#141A33';
      ctx.fillText(f.text, Math.round(f.x) + 1, y + 1);
      ctx.fillStyle = f.col;
      ctx.fillText(f.text, Math.round(f.x), y);
    }
    ctx.globalAlpha = 1;
  }
}

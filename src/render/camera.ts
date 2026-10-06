// The camera, in art pixels. Clamped to the world and snapped to whole device pixels by the renderer.
import { TILE_PX } from '../data/constants';

export class Camera {
  x = 0;
  y = 0;
  /** Smoothed target when following. */
  tx = 0;
  ty = 0;
  follow = false;

  clamp(worldW: number, worldH: number, viewW: number, viewH: number): void {
    const maxX = Math.max(0, worldW * TILE_PX - viewW);
    const maxY = Math.max(0, worldH * TILE_PX - viewH);
    // let the sky show above the world top a little, but never past the floor
    this.x = viewW >= worldW * TILE_PX ? (worldW * TILE_PX - viewW) / 2 : Math.min(maxX, Math.max(0, this.x));
    this.y = Math.min(maxY, Math.max(-TILE_PX * 4, this.y));
  }

  centerOn(px: number, py: number, viewW: number, viewH: number): void {
    this.x = px - viewW / 2;
    this.y = py - viewH * 0.4;
  }

  /** Glide toward a target point; used when following the foreman. */
  glide(px: number, py: number, viewW: number, viewH: number, dt: number): void {
    const gx = px - viewW / 2;
    const gy = py - viewH * 0.4;
    const k = 1 - Math.exp(-dt * 5);
    this.x += (gx - this.x) * k;
    this.y += (gy - this.y) * k;
  }
}

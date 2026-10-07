// Turns what happened this frame into sound (ADR-027). Runs beside the renderer's event handling and, like it, only reads.
import { TILE_PX } from '../data/constants';
import { biomeAt } from '../data/biomes';
import { CHIP_EVERY_MS, MUSIC_DEFAULT, SOUND_DEFAULT } from '../data/sounds';
import type { Game } from '../sim/game';
import { onSettings, setSettings, settings } from '../settings';
import { cuesFor } from './cues';
import { Sound } from './sound';

/** The part of the world on screen, in world pixels. */
export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Ears {
  readonly sound: Sound;
  private lastChip = 0;
  private biome = -1;
  private before = { sound: SOUND_DEFAULT as number, music: MUSIC_DEFAULT as number };

  constructor() {
    const s = settings();
    this.sound = new Sound(s.sound, s.music);
    onSettings((v) => this.sound.setLevels(v.sound, v.music));
    // browsers only let a page make sound after a touch or a key
    const unlock = (): void => this.sound.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () =>
      this.sound.pause(document.visibilityState === 'hidden'),
    );
    // a soft tick for every button in the panels
    document.addEventListener(
      'click',
      (e) => {
        if ((e.target as Element | null)?.closest?.('button')) this.sound.play('ui', performance.now());
      },
      { capture: true },
    );
  }

  /** Call once a frame, before the events are cleared. */
  frame(g: Game, view: View, now: number): void {
    const s = g.state;
    const f = s.foreman;
    const pan = (x: number): number => ((x + 0.5) * TILE_PX - view.x - view.w / 2) / (view.w / 2);
    const seen = (x: number, y: number): boolean => {
      const px = x * TILE_PX;
      const py = y * TILE_PX;
      return (
        px >= view.x - TILE_PX && px <= view.x + view.w && py >= view.y - TILE_PX && py <= view.y + view.h
      );
    };
    for (const e of g.events) {
      if (e.kind === 'verse') {
        this.sound.verse(e.verse, now);
        continue;
      }
      if (e.kind === 'caveIn') this.sound.song(e.verses, now);
      const at = 'x' in e ? e.x : f.x;
      const y = 'y' in e ? e.y : f.y;
      for (const p of cuesFor(e, seen(at, y), f.chain)) this.sound.play(p.id, now, p.pitch, pan(at) * 0.6);
    }
    // the pick keeps striking while the Foreman works a face, so a long dig never goes quiet
    if (f.target && now - this.lastChip >= CHIP_EVERY_MS) {
      this.lastChip = now;
      this.sound.play('chip', now, 1, pan(f.target.x) * 0.6);
    }
    const d = g.world.depth(f.y);
    const b = biomeAt(s.stats.maxDepthD).id;
    if (this.biome >= 0 && b > this.biome) this.sound.play('biome', now);
    this.biome = b;
    this.sound.ambient(biomeAt(d).id, d);
  }

  /** M: mute, or bring the sound back to where it was. Returns true when the sound is now on. */
  toggleMute(): boolean {
    const { sound, music } = settings();
    if (sound > 0 || music > 0) {
      this.before = { sound, music };
      setSettings({ sound: 0, music: 0 });
      return false;
    }
    setSettings(this.before);
    this.sound.unlock();
    return true;
  }
}

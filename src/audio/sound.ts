// The sound engine (ADR-027): Web Audio synthesis from the recipes in data/sounds. Reads events, never the sim's state.
// Browsers only allow sound after the player has touched the page, so nothing is created until then.
import {
  CUES,
  DRONE,
  DRONE_ROOTS,
  MASTER_GAIN,
  CAVEIN_SONG,
  VERSE_GAIN,
  VERSE_MOTIF,
  VERSE_NOTE_S,
  VERSE_RING_S,
  type Cue,
  type CueId,
} from '../data/sounds';
import { Throttle, verseNotes } from './cues';

type Ctx = AudioContext;

export class Sound {
  private ctx: Ctx | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private music!: GainNode;
  private noise!: AudioBuffer;
  private drone: { a: OscillatorNode; b: OscillatorNode; gain: GainNode; root: number } | null = null;
  private throttle = new Throttle();
  private sfxLevel = 0;
  private musicLevel = 0;

  constructor(sfx: number, music: number) {
    this.sfxLevel = sfx;
    this.musicLevel = music;
  }

  /** Call from a user gesture: makes (or wakes) the audio context. Safe to call often. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -10;
    limit.ratio.value = 12;
    limit.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.master.connect(limit);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = this.sfxLevel;
    this.sfx.connect(this.master);
    this.music = ctx.createGain();
    this.music.gain.value = this.musicLevel;
    this.music.connect(this.master);
    // one second of white noise, reused by every crunch and rumble
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  setLevels(sfx: number, music: number): void {
    this.sfxLevel = sfx;
    this.musicLevel = music;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.sfx.gain.setTargetAtTime(sfx, now, 0.05);
    this.music.gain.setTargetAtTime(music, now, 0.2);
  }

  /** The page was hidden or shown: stop the audio clock while nobody is listening. */
  pause(hidden: boolean): void {
    if (!this.ctx) return;
    if (hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  /** Play a cue. `pan` runs from -1 (left) to 1 (right); `nowMs` is the page clock, for throttling. */
  play(id: CueId, nowMs: number, pitch = 1, pan = 0): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.sfxLevel <= 0) return;
    const cue: Cue = CUES[id];
    if (!this.throttle.allow(id, cue.gap, nowMs)) return;
    const p = pitch * (1 + (cue.jitter ?? 0) * (Math.random() * 2 - 1));
    const out = this.panTo(pan);
    const t0 = ctx.currentTime + 0.005;
    for (const tn of cue.tones ?? []) {
      const at = t0 + (tn.at ?? 0);
      const o = ctx.createOscillator();
      o.type = tn.wave;
      o.frequency.setValueAtTime(tn.f * p, at);
      if (tn.to) o.frequency.exponentialRampToValueAtTime(tn.to * p, at + tn.a + tn.d);
      o.connect(this.envelope(at, tn.a, tn.d, tn.g, out));
      o.start(at);
      o.stop(at + tn.a + tn.d + 0.05);
    }
    for (const nz of cue.noise ?? []) {
      const at = t0 + (nz.at ?? 0);
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = nz.q;
      bp.frequency.setValueAtTime(nz.band * p, at);
      if (nz.to) bp.frequency.exponentialRampToValueAtTime(nz.to * p, at + nz.a + nz.d);
      src.connect(bp);
      bp.connect(this.envelope(at, nz.a, nz.d, nz.g, out));
      src.start(at, Math.random() * 0.5);
      src.stop(at + nz.a + nz.d + 0.05);
    }
  }

  /** A verse found: the song so far, as soft bells. */
  verse(verse: number, nowMs: number): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.sfxLevel <= 0) return;
    if (!this.throttle.allow('verse', 1500, nowMs)) return;
    const t0 = ctx.currentTime + 0.02;
    verseNotes(verse).forEach((f, i) => {
      const at = t0 + i * VERSE_NOTE_S;
      for (const [mult, wave, g] of [
        [1, 'sine', VERSE_GAIN],
        [2, 'triangle', VERSE_GAIN * 0.25],
      ] as const) {
        const o = ctx.createOscillator();
        o.type = wave;
        o.frequency.value = f * mult;
        o.connect(this.envelope(at, 0.01, VERSE_RING_S, g, this.sfx));
        o.start(at);
        o.stop(at + VERSE_RING_S + 0.1);
      }
    });
  }

  /** M9-04: the Cave-in sings one note for each verse found this run, under the Echo count. */
  song(verses: readonly number[], nowMs: number): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.sfxLevel <= 0 || !verses.length) return;
    if (!this.throttle.allow('song', 3000, nowMs)) return;
    const t0 = ctx.currentTime + CAVEIN_SONG.delayS;
    verses.forEach((v, i) => {
      const f = VERSE_MOTIF[Math.min(VERSE_MOTIF.length - 1, v)]!;
      const at = t0 + i * CAVEIN_SONG.gapS;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(this.envelope(at, 0.01, VERSE_RING_S, VERSE_GAIN, this.sfx));
      o.start(at);
      o.stop(at + VERSE_RING_S + 0.1);
    });
  }

  /** Keep the drone on the current biome's root, louder the deeper the Foreman stands. */
  ambient(biome: number, depthD: number): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const root = DRONE_ROOTS[biome] ?? 0;
    if (!this.drone) {
      if (root <= 0 || this.musicLevel <= 0) return;
      this.drone = this.startDrone(root);
    }
    const dr = this.drone;
    const now = ctx.currentTime;
    if (root > 0 && root !== dr.root) {
      dr.a.frequency.setTargetAtTime(root, now, DRONE.glideS / 3);
      dr.b.frequency.setTargetAtTime(root * DRONE.fifth, now, DRONE.glideS / 3);
      dr.root = root;
    }
    const k = Math.max(0, Math.min(1, depthD / DRONE.deepD));
    const g = root > 0 ? DRONE.gainTop + (DRONE.gainDeep - DRONE.gainTop) * k : 0;
    dr.gain.gain.setTargetAtTime(g, now, 0.8);
  }

  private startDrone(root: number): NonNullable<Sound['drone']> {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = DRONE.lowpass;
    lp.connect(gain);
    // the slow swell
    const swell = ctx.createGain();
    swell.gain.value = 1;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 1 / DRONE.swellS;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = DRONE.swell;
    lfo.connect(lfoDepth);
    lfoDepth.connect(swell.gain);
    gain.connect(swell);
    swell.connect(this.music);
    const a = ctx.createOscillator();
    a.type = 'sine';
    a.frequency.value = root;
    a.detune.value = -DRONE.detune;
    const b = ctx.createOscillator();
    b.type = 'triangle';
    b.frequency.value = root * DRONE.fifth;
    b.detune.value = DRONE.detune;
    a.connect(lp);
    b.connect(lp);
    a.start();
    b.start();
    lfo.start();
    return { a, b, gain, root };
  }

  private panTo(pan: number): AudioNode {
    if (!pan || !this.ctx!.createStereoPanner) return this.sfx;
    const p = this.ctx!.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(this.sfx);
    return p;
  }

  private envelope(at: number, a: number, d: number, g: number, out: AudioNode): GainNode {
    const e = this.ctx!.createGain();
    e.gain.setValueAtTime(0.0001, at);
    e.gain.exponentialRampToValueAtTime(g, at + a);
    e.gain.exponentialRampToValueAtTime(0.0001, at + a + d);
    e.connect(out);
    return e;
  }
}

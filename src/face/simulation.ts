/**
 * SIMULATION MODE — demo insurance.
 *
 * If the camera is refused, the model fails to load, or ?sim=1 is set, this
 * generates plausible-looking signals so every screen still works and the
 * whole flow stays demoable. The UI always says plainly when this is on; we
 * never pass invented signals off as a real reading of anyone's face.
 */

import { clamp01, deriveSignals, type FaceSignals, type Landmark } from './signals';

type Mood = 'neutral' | 'smile' | 'laugh' | 'confused' | 'away' | 'idle';

// How long each mood tends to last (ms) and how likely it is to be chosen next.
const MOODS: Record<Mood, { min: number; max: number; weight: number }> = {
  neutral: { min: 2600, max: 5200, weight: 34 },
  smile: { min: 1800, max: 3600, weight: 20 },
  laugh: { min: 1400, max: 3200, weight: 14 },
  confused: { min: 1600, max: 3000, weight: 12 },
  away: { min: 1200, max: 2600, weight: 10 },
  idle: { min: 4000, max: 7000, weight: 10 },
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class FaceSimulator {
  private mood: Mood = 'neutral';
  private moodUntil = 0;
  private phase = Math.random() * 1000;
  /** raised while something funny is on screen, so the sim actually reacts */
  private arousal = 0;
  private started = performance.now();
  private nextBlink = performance.now() + rand(2000, 6000);
  private blinkUntil = 0;

  /** 0..1 — nudges the simulator toward smiling/laughing (used by Reel Lab). */
  setArousal(a: number) {
    this.arousal = clamp01(a);
  }

  private pickMood(now: number) {
    const entries = Object.entries(MOODS) as Array<[Mood, (typeof MOODS)[Mood]]>;
    const weighted = entries.map(([m, cfg]) => {
      let w = cfg.weight;
      // when something funny is playing, laughing and smiling get much likelier
      if (m === 'laugh') w += this.arousal * 46;
      if (m === 'smile') w += this.arousal * 30;
      if (m === 'idle' || m === 'away') w *= 1 - this.arousal * 0.8;
      if (m === this.mood) w *= 0.25; // discourage repeats
      return [m, w] as const;
    });
    const total = weighted.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [m, w] of weighted) {
      r -= w;
      if (r <= 0) {
        this.mood = m;
        break;
      }
    }
    const cfg = MOODS[this.mood];
    this.moodUntil = now + rand(cfg.min, cfg.max);
  }

  next(now: number): { signals: FaceSignals; landmarks: Landmark[] } {
    if (now > this.moodUntil) this.pickMood(now);
    this.phase += 0.016;

    const t = (now - this.started) / 1000;
    // layered slow noise so nothing looks like a clean sine wave
    const wobble = (f: number, o = 0) =>
      (Math.sin(t * f + o) + Math.sin(t * f * 1.7 + o * 2.3) * 0.5) / 1.5;

    // envelope: ramp in and out of each mood instead of snapping
    const cfg = MOODS[this.mood];
    const life = 1 - clamp01((this.moodUntil - now) / (cfg.max - cfg.min + cfg.min));
    const env = clamp01(Math.sin(life * Math.PI) * 1.35);

    const shapes: Record<string, number> = {};
    let yaw = wobble(0.25) * 6;
    let pitch = wobble(0.19, 1.4) * 4;
    const roll = wobble(0.16, 2.1) * 3;
    let motion = 0.08 + Math.abs(wobble(0.9, 0.4)) * 0.1;

    switch (this.mood) {
      case 'smile': {
        const v = 0.42 + env * 0.24 + wobble(1.2) * 0.05;
        shapes.mouthSmileLeft = v;
        shapes.mouthSmileRight = v * 0.96;
        shapes.cheekSquintLeft = v * 0.5;
        shapes.cheekSquintRight = v * 0.5;
        motion += 0.06;
        break;
      }
      case 'laugh': {
        const v = 0.62 + env * 0.3;
        shapes.mouthSmileLeft = v;
        shapes.mouthSmileRight = v;
        shapes.jawOpen = 0.4 + env * 0.42 + Math.abs(wobble(4.5)) * 0.12;
        shapes.cheekSquintLeft = 0.6;
        shapes.cheekSquintRight = 0.6;
        shapes.eyeBlinkLeft = 0.3;
        shapes.eyeBlinkRight = 0.3;
        motion += 0.22 + Math.abs(wobble(5)) * 0.14; // shaking with laughter
        pitch += wobble(5) * 5;
        break;
      }
      case 'confused': {
        shapes.browInnerUp = 0.45 + env * 0.3;
        shapes.browDownLeft = 0.42 + env * 0.25;
        shapes.browDownRight = 0.06;
        shapes.mouthPucker = 0.3 + env * 0.2;
        motion += 0.04;
        break;
      }
      case 'away': {
        yaw += (28 + env * 16) * (this.phase % 2 < 1 ? 1 : -1);
        shapes.eyeLookOutLeft = 0.6 + env * 0.3;
        motion += 0.18;
        break;
      }
      case 'idle': {
        yaw *= 0.15;
        pitch *= 0.15;
        motion = 0.012 + Math.abs(wobble(0.4)) * 0.012; // almost frozen
        break;
      }
      case 'neutral':
      default: {
        shapes.mouthSmileLeft = 0.06 + Math.abs(wobble(0.7)) * 0.06;
        shapes.mouthSmileRight = shapes.mouthSmileLeft;
        break;
      }
    }

    // Blink on a randomised 4-9s schedule — roughly a human resting rate, and
    // slow enough that STARE CONTEST is actually a contest.
    if (now > this.nextBlink) {
      this.blinkUntil = now + 140;
      this.nextBlink = now + rand(4000, 9000);
    }
    if (now < this.blinkUntil) {
      shapes.eyeBlinkLeft = 1;
      shapes.eyeBlinkRight = 1;
    }

    const signals = deriveSignals(shapes, { yaw, pitch, roll }, motion, now);
    return { signals, landmarks: this.fakeLandmarks(yaw, pitch, signals) };
  }

  /** A sparse ring of points so the scan overlay has something to draw. */
  private fakeLandmarks(yaw: number, pitch: number, s: FaceSignals): Landmark[] {
    const pts: Landmark[] = [];
    const cx = 0.5 + yaw / 260;
    const cy = 0.5 + pitch / 220;
    for (let i = 0; i < 88; i++) {
      const a = (i / 88) * Math.PI * 2;
      const rx = 0.17 + Math.sin(a * 3) * 0.012;
      const ry = 0.235 + Math.cos(a * 2) * 0.015;
      pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, z: 0 });
    }
    // eyes + mouth so it reads as a face, not a circle
    for (const [ex, ey] of [
      [-0.062, -0.055],
      [0.062, -0.055],
    ]) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        pts.push({ x: cx + ex + Math.cos(a) * 0.032, y: cy + ey + Math.sin(a) * 0.017, z: 0 });
      }
    }
    const open = 0.016 + s.jawOpen * 0.055;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(a) * 0.058, y: cy + 0.105 + Math.sin(a) * open, z: 0 });
    }
    return pts;
  }
}

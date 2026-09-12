/**
 * Turns the continuous signal stream into discrete events.
 *
 * Everything downstream (notifications, the process table, the pinnakk score)
 * reacts to events, not raw signals — so the thresholds here are what stop the
 * app from screaming every single frame. Each rule has:
 *   enter  — level that starts the event
 *   exit   — lower level that ends it (hysteresis, kills flicker at the boundary)
 *   hold   — how long the enter condition must persist
 *   cool   — minimum gap before the same event can fire again
 */

import type { FaceSignals } from './signals';

export type FaceEventType =
  | 'SMILE'
  | 'LAUGH'
  | 'LOOK_AWAY'
  | 'IDLE'
  | 'CONFUSED'
  | 'SHAKY'
  | 'SURPRISE'
  | 'FACE_LOST'
  | 'FACE_FOUND';

export interface FaceEvent {
  type: FaceEventType;
  at: number;
  intensity: number;
}

interface Rule {
  type: FaceEventType;
  read: (s: FaceSignals) => number;
  enter: number;
  exit: number;
  holdMs: number;
  coolMs: number;
}

const RULES: Rule[] = [
  { type: 'LAUGH', read: (s) => s.laugh, enter: 0.55, exit: 0.35, holdMs: 220, coolMs: 5000 },
  { type: 'SMILE', read: (s) => s.smile, enter: 0.45, exit: 0.28, holdMs: 320, coolMs: 6000 },
  { type: 'CONFUSED', read: (s) => s.confusion, enter: 0.5, exit: 0.3, holdMs: 1000, coolMs: 10000 },
  { type: 'SURPRISE', read: (s) => s.surprise, enter: 0.6, exit: 0.35, holdMs: 200, coolMs: 12000 },
  { type: 'LOOK_AWAY', read: (s) => s.gazeAway, enter: 0.55, exit: 0.3, holdMs: 800, coolMs: 8000 },
  { type: 'SHAKY', read: (s) => s.motion, enter: 0.55, exit: 0.3, holdMs: 600, coolMs: 8000 },
  { type: 'IDLE', read: (s) => s.stillness, enter: 0.95, exit: 0.85, holdMs: 5000, coolMs: 12000 },
];

interface RuleState {
  active: boolean;
  since: number | null;
  lastFired: number;
}

export class FaceEventDetector {
  private state = new Map<FaceEventType, RuleState>();
  private presentSince: number | null = null;
  private absentSince: number | null = null;
  private wasPresent = false;
  private lastPresenceEvent = 0;

  constructor() {
    for (const r of RULES) this.state.set(r.type, { active: false, since: null, lastFired: 0 });
  }

  /** Feed one frame; get back any events that just fired. */
  update(s: FaceSignals, now: number): FaceEvent[] {
    const out: FaceEvent[] = [];

    // --- presence ---
    if (s.present) {
      this.absentSince = null;
      if (this.presentSince === null) this.presentSince = now;
      if (!this.wasPresent && now - this.lastPresenceEvent > 3000) {
        this.wasPresent = true;
        this.lastPresenceEvent = now;
        out.push({ type: 'FACE_FOUND', at: now, intensity: 1 });
      }
    } else {
      this.presentSince = null;
      if (this.absentSince === null) this.absentSince = now;
      if (
        this.wasPresent &&
        now - this.absentSince > 1200 &&
        now - this.lastPresenceEvent > 10000
      ) {
        this.wasPresent = false;
        this.lastPresenceEvent = now;
        out.push({ type: 'FACE_LOST', at: now, intensity: 1 });
      }
      // No face means no expression rules; let them all relax.
      for (const st of this.state.values()) {
        st.active = false;
        st.since = null;
      }
      return out;
    }

    // --- expression rules ---
    for (const rule of RULES) {
      const st = this.state.get(rule.type)!;
      const v = rule.read(s);

      if (st.active) {
        if (v < rule.exit) {
          st.active = false;
          st.since = null;
        }
        continue;
      }

      if (v >= rule.enter) {
        if (st.since === null) st.since = now;
        const held = now - st.since;
        if (held >= rule.holdMs && now - st.lastFired >= rule.coolMs) {
          st.active = true;
          st.lastFired = now;
          out.push({ type: rule.type, at: now, intensity: v });
        }
      } else {
        st.since = null;
      }
    }

    return out;
  }

  reset() {
    for (const st of this.state.values()) {
      st.active = false;
      st.since = null;
      st.lastFired = 0;
    }
    this.wasPresent = false;
    this.presentSince = null;
    this.absentSince = null;
  }
}

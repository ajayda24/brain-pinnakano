/**
 * The fictional vital signs.
 *
 * Runs one 10Hz tick that eases every metric toward a target derived from the
 * live face signals, so the numbers are always moving but never twitching.
 * Publishes imperatively (not through React state) — the hot readouts subscribe
 * and write to the DOM directly, which is what keeps this feeling like an OS
 * instead of a laggy dashboard.
 *
 * None of these numbers mean anything. That is the entire premise.
 */

import { faceEngine } from '../face/faceEngine';
import type { FaceEvent } from '../face/events';
import { clamp, clamp01, type FaceSignals } from '../face/signals';
import { EMPTY_SIGNALS } from '../face/signals';
import { AMBIENT_ALERTS, EVENT_ALERTS } from '../config/errors';
import { chayaLevel, PINNAKK_CATEGORIES, type ChayaLevel } from '../config/pinnakk';
import { useApp } from './store';
import { accumulate, countEvent, session } from './session';

export interface Metrics {
  brainCpu: number;
  brainRam: number;
  motivation: number;
  attention: number;
  socialBattery: number;
  pinnakkLevel: number;
  brainTemp: number;
  commonSense: number;
  productivity: number;
  overthinking: number;
  pinnakkKg: number;
  chaya: ChayaLevel;
  categories: Record<string, number>;

  /* --- system-style readouts, so the panel reads like a real monitor --- */
  ramUsedGb: number;
  ramTotalGb: number;
  uptimeSec: number;
  threads: number;
  handles: number;
  procCount: number;
}

/** Metrics that get a 60-second performance graph. */
export type SeriesKey =
  | 'brainCpu'
  | 'brainRam'
  | 'motivation'
  | 'attention'
  | 'socialBattery'
  | 'pinnakkLevel';

export const SERIES_KEYS: SeriesKey[] = [
  'brainCpu',
  'brainRam',
  'motivation',
  'attention',
  'socialBattery',
  'pinnakkLevel',
];

/** 120 samples at 500ms = the 60-second window a task manager shows. */
export const SERIES_LEN = 120;
export const SERIES_MS = 500;

export interface MetricsSnapshot {
  m: Metrics;
  /** live CPU% per process — normalised so the column sums to m.brainCpu */
  cpu: Record<string, number>;
  /** live working set per process, in GB, summing to m.ramUsedGb */
  ram: Record<string, number>;
  history: Record<string, number[]>;
  /** rolling 60s history for the performance graphs */
  series: Record<SeriesKey, number[]>;
  signals: FaceSignals;
}

const TICK_MS = 100;
const HISTORY = 32;

function initialMetrics(): Metrics {
  const categories: Record<string, number> = {};
  for (const c of PINNAKK_CATEGORIES) categories[c.id] = c.base;
  return {
    brainCpu: 62,
    brainRam: 88,
    motivation: 12,
    attention: 55,
    socialBattery: 74,
    pinnakkLevel: 46,
    brainTemp: 61.2,
    commonSense: 28,
    productivity: 3,
    overthinking: 71,
    pinnakkKg: 6.4,
    chaya: 'NOMINAL',
    categories,
    ramUsedGb: 12.4,
    ramTotalGb: 16,
    uptimeSec: 0,
    threads: 1847,
    handles: 41233,
    procCount: 10,
  };
}

const rnd = (n: number) => (Math.random() - 0.5) * n;
/** ease `v` toward `t` by rate `r`, with a little noise so it never sits still */
const ease = (v: number, t: number, r: number, jitter = 0) => v + (t - v) * r + rnd(jitter);

type Sub = (s: MetricsSnapshot) => void;

class MetricsEngine {
  metrics: Metrics = initialMetrics();
  cpu: Record<string, number> = {};
  ram: Record<string, number> = {};
  history: Record<string, number[]> = {};
  series: Record<SeriesKey, number[]> = Object.fromEntries(
    SERIES_KEYS.map((k) => [k, [] as number[]]),
  ) as Record<SeriesKey, number[]>;
  signals: FaceSignals = { ...EMPTY_SIGNALS };

  private subs = new Set<Sub>();
  private timer: number | null = null;
  private lastTick = 0;
  private lastAmbient = 0;
  private lastSeries = 0;
  private started = 0;
  /** smoothed per-process weights, so the CPU column does not flicker */
  private weights: Record<string, number> = {};
  /** 0..1, raised by Reel Lab while something is playing */
  private reelActivity = 0;
  private paused = false;

  start() {
    if (this.timer !== null) return;
    this.started = performance.now();
    this.lastTick = performance.now();
    this.lastAmbient = performance.now();

    faceEngine.subscribe((f) => {
      this.signals = f.signals;
    });
    faceEngine.onEvent((e) => this.onFaceEvent(e));

    this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  /** Pause ambient noise during dramatic moments (the final report). */
  setPaused(p: boolean) {
    this.paused = p;
  }

  setReelActivity(a: number) {
    this.reelActivity = clamp01(a);
    faceEngine.setArousal(clamp01(a));
  }

  subscribe(fn: Sub) {
    this.subs.add(fn);
    fn(this.snapshot());
    return () => {
      this.subs.delete(fn);
    };
  }

  snapshot(): MetricsSnapshot {
    return {
      m: this.metrics,
      cpu: this.cpu,
      ram: this.ram,
      history: this.history,
      series: this.series,
      signals: this.signals,
    };
  }

  /** Direct nudges from gameplay. */
  bumpPinnakk(delta: number, reason?: string) {
    this.metrics.pinnakkLevel = clamp(this.metrics.pinnakkLevel + delta, 0, 100);
    if (reason) {
      useApp.getState().notify({
        icon: delta > 0 ? '🐄' : '✨',
        title: reason,
        body: `പിണ്ണാക്ക് ${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`,
        tone: delta > 0 ? 'pinnakk' : 'ok',
      });
    }
  }

  bumpMotivation(delta: number) {
    this.metrics.motivation = clamp(this.metrics.motivation + delta, 0, 100);
  }

  // ---------------------------------------------------------------- events

  private onFaceEvent(e: FaceEvent) {
    countEvent(e.type);
    const app = useApp.getState();

    const variants = EVENT_ALERTS[e.type];
    if (variants?.length) {
      app.notify(variants[Math.floor(Math.random() * variants.length)]);
    }

    switch (e.type) {
      case 'LAUGH':
        app.spawnProcess('laughing', 20000);
        this.metrics.brainCpu = clamp(this.metrics.brainCpu + 12, 0, 100);
        // laughing burns off a little പിണ്ണാക്ക്. Only a little.
        this.metrics.pinnakkLevel = clamp(this.metrics.pinnakkLevel - 1.4, 0, 100);
        break;
      case 'SMILE':
        app.spawnProcess('happiness', 14000);
        break;
      case 'CONFUSED':
        this.metrics.overthinking = clamp(this.metrics.overthinking + 9, 0, 100);
        this.metrics.pinnakkLevel = clamp(this.metrics.pinnakkLevel + 1.1, 0, 100);
        break;
      case 'LOOK_AWAY':
        app.endProcess('focus');
        // Focus.exe always comes back. It just takes a moment.
        window.setTimeout(() => useApp.getState().restartProcess('focus'), 6000);
        this.metrics.attention = clamp(this.metrics.attention - 24, 0, 100);
        break;
      case 'IDLE':
        app.setProcessStatus('human', 'Not responding');
        app.spawnProcess('nostalgia', 18000);
        window.setTimeout(() => useApp.getState().setProcessStatus('human', 'Running'), 9000);
        this.metrics.pinnakkLevel = clamp(this.metrics.pinnakkLevel + 1.8, 0, 100);
        break;
      case 'SHAKY':
        this.metrics.brainCpu = clamp(this.metrics.brainCpu + 8, 0, 100);
        break;
      case 'FACE_LOST':
        this.metrics.attention = clamp(this.metrics.attention - 30, 0, 100);
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------------ tick

  private tick() {
    const now = performance.now();
    const dt = now - this.lastTick;
    this.lastTick = now;

    const s = this.signals;
    const m = this.metrics;
    const elapsedMin = (now - this.started) / 60000;

    // --- headline metrics -------------------------------------------------
    // Real CPU traces wander in a band and spike briefly; they do not vibrate.
    // Low jitter + a slow wander term reads far more like instrumentation than
    // per-tick noise did.
    const wander = Math.sin(now / 5200) * 4 + Math.sin(now / 1700) * 2;
    const cpuTarget =
      42 + wander + s.laugh * 30 + s.confusion * 18 + s.motion * 9 + this.reelActivity * 12;
    m.brainCpu = clamp(ease(m.brainCpu, cpuTarget, 0.06, 0.35), 2, 100);

    // RAM is always nearly full. You are not forgetting anything, ever.
    m.brainRam = clamp(ease(m.brainRam, 74 + s.confusion * 10 + elapsedMin * 0.7, 0.02, 0.12), 40, 97);

    // Motivation decays toward 4 no matter what you do about it.
    m.motivation = clamp(ease(m.motivation, 4, 0.012, 0.08), 0, 100);

    const attentionTarget = !s.present ? 6 : 88 - s.gazeAway * 70 - s.stillness * 16;
    m.attention = clamp(ease(m.attention, attentionTarget, 0.05, 0.3), 0, 100);

    // Social battery only ever goes down. ~22 points an hour, plus talking cost.
    m.socialBattery = clamp(m.socialBattery - (dt / 60000) * (0.36 + s.jawOpen * 0.5), 0, 100);

    m.overthinking = clamp(
      ease(m.overthinking, 62 + s.confusion * 30 + s.stillness * 12, 0.035, 0.2),
      0,
      100,
    );

    m.productivity = clamp(ease(m.productivity, 3, 0.05, 0.18), 0, 9);
    // thermal mass: temperature lags CPU instead of tracking it instantly
    m.brainTemp = ease(m.brainTemp, 36.5 + m.brainCpu * 0.52, 0.012, 0.05);
    m.commonSense = clamp(ease(m.commonSense, 100 - m.pinnakkLevel * 0.92, 0.02, 0.15), 0, 100);

    // --- system counters --------------------------------------------------
    m.uptimeSec = (now - this.started) / 1000;
    m.ramTotalGb = 16;
    m.ramUsedGb = (m.brainRam / 100) * m.ramTotalGb;
    // thread/handle counts drift the way a busy machine's do
    m.threads = Math.round(1600 + m.brainCpu * 5.5 + Math.sin(now / 9000) * 40);
    m.handles = Math.round(38000 + m.brainRam * 90 + Math.sin(now / 13000) * 600);

    // --- പിണ്ണാക്ക് accumulator ------------------------------------------
    // It integrates rather than easing: it remembers, and it trends upward.
    let pinnakkRate = 0;
    pinnakkRate += s.stillness * 0.055; // ചുമ്മാ ഇരിക്കൽ
    pinnakkRate += s.confusion * 0.05; // വെറുതെ ചിന്തിക്കൽ
    pinnakkRate += this.reelActivity * 0.09; // റീൽ പിണ്ണാക്ക്
    pinnakkRate += s.gazeAway * 0.035;
    pinnakkRate -= s.laugh * 0.045; // laughter helps, briefly
    pinnakkRate += 0.012; // baseline. Time alone does it.
    m.pinnakkLevel = clamp(m.pinnakkLevel + pinnakkRate * (dt / 100), 0, 100);
    m.pinnakkKg = 2.4 + (m.pinnakkLevel / 100) * 8.6 + Math.sin(now / 4200) * 0.18;

    m.chaya = chayaLevel(new Date().getHours(), m.socialBattery);

    // --- pinnakk breakdown ----------------------------------------------
    const drivers: Record<string, number> = {
      think: 14 + s.confusion * 26 + m.overthinking * 0.16,
      memory: 16 + s.stillness * 16 + elapsedMin * 1.4,
      reel: 18 + this.reelActivity * 34 + session.reels.length * 4.5,
      idle: 8 + s.stillness * 20,
      love: 5 + Math.abs(Math.sin(now / 21000)) * 12,
      random: 6 + Math.abs(Math.sin(now / 7300)) * 10,
    };
    let sum = 0;
    for (const c of PINNAKK_CATEGORIES) sum += drivers[c.driver];
    for (const c of PINNAKK_CATEGORIES) {
      const share = (drivers[c.driver] / sum) * 100;
      m.categories[c.id] = ease(m.categories[c.id], share, 0.05, 0.15);
    }

    // --- process table ----------------------------------------------------
    // A real task manager's CPU column SUMS to the total. Previously each row
    // carried an independent number and the column added up to ~400%, which is
    // the single thing that made the panel read as fake. So: each process gets a
    // smoothed *weight*, and the column is that weight's share of m.brainCpu.
    const app = useApp.getState();
    const driverValue: Record<string, number> = {
      smile: s.smile,
      laugh: s.laugh,
      confusion: s.confusion,
      idle: s.stillness,
      gaze: s.gazeAway,
      motion: s.motion,
      reel: this.reelActivity,
    };

    let weightSum = 0;
    let ramWeightSum = 0;
    for (const p of app.processes) {
      const driven = p.driver && !p.ended ? driverValue[p.driver] * 40 : 0;
      const raw = p.ended ? 0 : Math.max(0.4, p.cpu + driven + rnd(3));
      const prev = this.weights[p.id] ?? raw;
      const w = p.ended ? Math.max(0, prev - 6) : ease(prev, raw, 0.12);
      this.weights[p.id] = w;
      weightSum += w;
      ramWeightSum += p.ended ? 0 : p.ram;
    }

    for (const p of app.processes) {
      const share = weightSum > 0 ? this.weights[p.id] / weightSum : 0;
      this.cpu[p.id] = share * m.brainCpu;
      this.ram[p.id] =
        ramWeightSum > 0 && !p.ended ? (p.ram / ramWeightSum) * m.ramUsedGb : 0;

      const h = (this.history[p.id] ??= Array.from({ length: HISTORY }, () => this.cpu[p.id]));
      h.push(this.cpu[p.id]);
      if (h.length > HISTORY) h.shift();
    }
    m.procCount = app.processes.filter((p) => !p.ended).length;
    app.reapProcesses(Date.now());

    // --- 60-second performance history ------------------------------------
    if (now - this.lastSeries >= SERIES_MS) {
      this.lastSeries = now;
      for (const k of SERIES_KEYS) {
        const arr = this.series[k];
        arr.push(m[k]);
        if (arr.length > SERIES_LEN) arr.shift();
      }
    }

    // --- session + ambient noise -----------------------------------------
    accumulate(dt, s, m.attention);

    if (!this.paused && now - this.lastAmbient > 26000 + Math.random() * 20000) {
      this.lastAmbient = now;
      app.notify(AMBIENT_ALERTS[Math.floor(Math.random() * AMBIENT_ALERTS.length)]);
    }

    const snap = this.snapshot();
    for (const fn of this.subs) fn(snap);
  }
}

export const metrics = new MetricsEngine();

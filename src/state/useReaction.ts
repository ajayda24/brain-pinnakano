/**
 * Records a reaction trace while a reel plays, and turns it into the numbers
 * the REEL PERFORMANCE REPORT shows off. Samples at 4Hz — enough resolution for
 * a timeline, cheap enough to run alongside everything else.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { faceEngine } from '../face/faceEngine';
import { metrics } from '../state/metricsEngine';

export interface ReactionSample {
  t: number;
  smile: number;
  laugh: number;
  attention: number;
}

export interface ReactionSummary {
  maxLaugh: number;
  attention: number;
  smileSeconds: number;
  pokerFace: number;
  pinnakkDelta: number;
  durationSec: number;
}

const HZ = 4;
const INTERVAL = 1000 / HZ;

export function useReactionRecorder() {
  const [samples, setSamples] = useState<ReactionSample[]>([]);
  const buffer = useRef<ReactionSample[]>([]);
  const startedAt = useRef(0);
  const timer = useRef(0);

  const start = useCallback(() => {
    buffer.current = [];
    setSamples([]);
    startedAt.current = performance.now();
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      const s = faceEngine.lastFrame.signals;
      buffer.current.push({
        t: (performance.now() - startedAt.current) / 1000,
        smile: s.smile,
        laugh: s.laugh,
        attention: metrics.metrics.attention / 100,
      });
      // publish a copy so the live timeline re-renders
      setSamples([...buffer.current]);
    }, INTERVAL);
  }, []);

  const stop = useCallback(() => {
    window.clearInterval(timer.current);
    timer.current = 0;
  }, []);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const summarise = useCallback((): ReactionSummary => {
    const s = buffer.current;
    if (!s.length) {
      return {
        maxLaugh: 0,
        attention: 0,
        smileSeconds: 0,
        pokerFace: 100,
        pinnakkDelta: 0,
        durationSec: 0,
      };
    }
    const maxLaugh = Math.max(...s.map((x) => x.laugh));
    const attention = (s.reduce((a, x) => a + x.attention, 0) / s.length) * 100;
    const smiling = s.filter((x) => x.smile > 0.35).length;
    const straight = s.filter((x) => x.smile < 0.2).length;
    return {
      maxLaugh: maxLaugh * 100,
      attention,
      smileSeconds: smiling / HZ,
      pokerFace: (straight / s.length) * 100,
      // laughing works some of it off; watching reels at all puts it back
      pinnakkDelta: -(maxLaugh * 16) + 4,
      durationSec: s[s.length - 1].t,
    };
  }, []);

  return { samples, start, stop, summarise };
}

/** Bucket a trace into the emoji strip the brief asks for. */
export function timelineBuckets(samples: ReactionSample[], count = 5) {
  if (!samples.length) return [];
  const total = samples[samples.length - 1].t || 1;
  return Array.from({ length: count }, (_, i) => {
    const from = (i / count) * total;
    const to = ((i + 1) / count) * total;
    const slice = samples.filter((s) => s.t >= from && s.t < to);
    const peakLaugh = slice.length ? Math.max(...slice.map((s) => s.laugh)) : 0;
    const peakSmile = slice.length ? Math.max(...slice.map((s) => s.smile)) : 0;
    const emoji =
      peakLaugh > 0.65 ? '😂😂' : peakLaugh > 0.45 ? '😂' : peakSmile > 0.35 ? '🙂' : '😐';
    return { at: from, emoji, peakLaugh, peakSmile };
  });
}

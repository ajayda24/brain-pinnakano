import { useEffect, useRef, useState } from 'react';
import { metrics, type MetricsSnapshot } from './metricsEngine';

/** Imperative: fires at the full 10Hz tick and never re-renders. */
export function useMetricsFrame(fn: (s: MetricsSnapshot) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => metrics.subscribe((s) => ref.current(s)), []);
}

/** Re-rendering, throttled. Only for readouts that must go through React. */
export function useMetrics(hz = 4): MetricsSnapshot {
  const [snap, setSnap] = useState<MetricsSnapshot>(() => metrics.snapshot());
  const last = useRef(0);
  useEffect(() => {
    const interval = 1000 / hz;
    return metrics.subscribe((s) => {
      const now = performance.now();
      if (now - last.current < interval) return;
      last.current = now;
      // shallow copy so React sees a new object each time
      setSnap({ ...s, m: { ...s.m } });
    });
  }, [hz]);
  return snap;
}

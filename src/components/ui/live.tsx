/**
 * Metric-bound display components.
 *
 * These subscribe to the 10Hz metrics tick and write straight to the DOM — no
 * setState, no reconciliation. React owns the structure; these own the pixels.
 * That split is what lets a dozen readouts animate at once without the UI
 * turning to soup.
 */

import { useEffect, useRef, type CSSProperties } from 'react';
import {
  metrics,
  SERIES_LEN,
  type MetricsSnapshot,
  type SeriesKey,
} from '../../state/metricsEngine';
import { useMetricsFrame } from '../../state/useMetrics';

type Select = (s: MetricsSnapshot) => number;

/* ------------------------------------------------------------ LiveNumber */

export function LiveNumber({
  select,
  format = (n) => Math.round(n).toString(),
  colorOf,
  className = 'mono',
  style,
}: {
  select: Select;
  format?: (n: number) => string;
  /** recomputed every tick, so thresholds can change the colour live */
  colorOf?: (n: number) => string;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useMetricsFrame((s) => {
    const el = ref.current;
    if (!el) return;
    const v = select(s);
    const next = format(v);
    if (el.textContent !== next) el.textContent = next;
    if (colorOf) {
      const c = colorOf(v);
      if (el.style.color !== c) el.style.color = c;
    }
  });
  return (
    <span ref={ref} className={className} style={style}>
      {format(select(metrics.snapshot()))}
    </span>
  );
}

/** Same idea, for readouts that are words rather than numbers. */
export function LiveText({
  select,
  colorOf,
  className = 'mono',
  style,
}: {
  select: (s: MetricsSnapshot) => string;
  colorOf?: (v: string) => string;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useMetricsFrame((s) => {
    const el = ref.current;
    if (!el) return;
    const next = select(s);
    if (el.textContent !== next) el.textContent = next;
    if (colorOf) {
      const c = colorOf(next);
      if (el.style.color !== c) el.style.color = c;
    }
  });
  return (
    <span ref={ref} className={className} style={style}>
      {select(metrics.snapshot())}
    </span>
  );
}

/* --------------------------------------------------------------- LiveBar */

export function LiveBar({
  select,
  color = 'var(--blue)',
  height = 7,
}: {
  select: Select;
  color?: string;
  height?: number;
}) {
  const fill = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  useMetricsFrame((s) => {
    const v = Math.max(0, Math.min(100, select(s)));
    if (fill.current) fill.current.style.width = `${v}%`;
    if (ghost.current) ghost.current.style.width = `${v}%`;
  });
  return (
    <div className="bar" style={{ ['--h' as string]: `${height}px`, ['--c' as string]: color }}>
      <div ref={ghost} className="bar__ghost" style={{ width: '0%' }} />
      <div ref={fill} className="bar__fill" style={{ width: '0%' }} />
    </div>
  );
}

/* ------------------------------------------------------- PerfGraph */

/**
 * Task-manager performance trace: a gridded plot of the last 60 seconds,
 * with a solid fill under a solid line. Canvas, driven straight from the
 * metrics tick — no React re-render per frame.
 */
export function PerfGraph({
  seriesKey,
  color,
  height = 120,
  grid = true,
  max = 100,
}: {
  seriesKey: SeriesKey;
  color: string;
  height?: number;
  grid?: boolean;
  max?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const resolved = useRef(color);

  useEffect(() => {
    const el = ref.current;
    if (el) resolved.current = getComputedStyle(el).color || color;
  }, [color]);

  useMetricsFrame((s) => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const rect = cvs.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (!w || !h) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cvs.width !== Math.round(w * dpr)) {
      cvs.width = Math.round(w * dpr);
      cvs.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (grid) {
      ctx.strokeStyle = 'rgba(20,23,31,.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 10; i++) {
        const x = Math.round((i / 10) * w) + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let i = 1; i < 5; i++) {
        const y = Math.round((i / 5) * h) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
    }

    const data = s.series[seriesKey];
    if (!data || data.length < 2) return;

    // Always plot against the full window so the trace scrolls in from the
    // right as it fills, the way a real monitor does.
    const step = w / (SERIES_LEN - 1);
    const x0 = w - (data.length - 1) * step;
    const y = (v: number) => h - (Math.max(0, Math.min(max, v)) / max) * (h - 2) - 1;

    ctx.beginPath();
    ctx.moveTo(x0, h);
    data.forEach((v, i) => ctx.lineTo(x0 + i * step, y(v)));
    ctx.lineTo(x0 + (data.length - 1) * step, h);
    ctx.closePath();
    ctx.fillStyle = resolved.current;
    ctx.globalAlpha = 0.16;
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.beginPath();
    data.forEach((v, i) =>
      i ? ctx.lineTo(x0 + i * step, y(v)) : ctx.moveTo(x0, y(v)),
    );
    ctx.strokeStyle = resolved.current;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
  });

  return (
    <canvas
      ref={ref}
      style={{ width: '100%', height, display: 'block', color }}
      aria-hidden
    />
  );
}

import { useRef, useState } from 'react';
import { useCameraVideo, useEngineStatus, useFaceFrame } from '../face/useFaceSignals';
import type { Landmark } from '../face/signals';

/**
 * Landmark overlay. Draws into a canvas that mirrors horizontally to match the
 * flipped video, so the dots land on the face rather than beside it.
 */
export function FaceOverlay({
  className,
  dotSize = 1.3,
  color = 'rgba(0,184,212,.85)',
  every = 2,
}: {
  className?: string;
  dotSize?: number;
  color?: string;
  every?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useFaceFrame((f) => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const rect = cvs.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cvs.width !== Math.round(rect.width * dpr)) {
      cvs.width = Math.round(rect.width * dpr);
      cvs.height = Math.round(rect.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const pts = f.landmarks as Landmark[] | null;
    if (!pts?.length) return;

    ctx.fillStyle = color;
    for (let i = 0; i < pts.length; i += every) {
      const p = pts[i];
      ctx.beginPath();
      ctx.arc(p.x * rect.width, p.y * rect.height, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // tracking bracket around the detected face
    let minX = 1;
    let minY = 1;
    let maxX = 0;
    let maxY = 0;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const x = minX * rect.width;
    const y = minY * rect.height;
    const w = (maxX - minX) * rect.width;
    const h = (maxY - minY) * rect.height;
    const arm = Math.min(w, h) * 0.22;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (const [cx, cy, dx, dy] of [
      [x, y, 1, 1],
      [x + w, y, -1, 1],
      [x, y + h, 1, -1],
      [x + w, y + h, -1, -1],
    ]) {
      ctx.moveTo(cx + dx * arm, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * arm);
    }
    ctx.stroke();
  });

  return (
    <canvas
      ref={ref}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        transform: 'scaleX(-1)',
        pointerEvents: 'none',
      }}
    />
  );
}

/** Persistent corner camera preview. */
export function WebcamPip({ hidden = false }: { hidden?: boolean }) {
  const videoRef = useCameraVideo();
  const status = useEngineStatus();
  const labelRef = useRef<HTMLSpanElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useFaceFrame((f) => {
    const el = labelRef.current;
    if (!el) return;
    const txt = f.signals.present ? 'TRACKING' : 'NO SUBJECT';
    if (el.textContent !== txt) el.textContent = txt;
  });

  if (hidden) return null;

  // A self-view always floats over something. Let people fold it away.
  if (collapsed) {
    return (
      <button
        className="pip pip--collapsed"
        onClick={() => setCollapsed(false)}
        title="Show camera preview"
        aria-label="Show camera preview"
      >
        <span
          className="pip__dot"
          style={{ background: status.simulated ? '#e0179c' : '#ef4444' }}
        />
        <span>📷</span>
      </button>
    );
  }

  return (
    <div className={`pip ${status.cameraOk ? '' : 'pip--sim'}`}>
      {status.cameraOk ? (
        <video ref={videoRef} className="pip__video" autoPlay muted playsInline />
      ) : (
        <div className="pip__simbox">
          <span style={{ fontSize: 30, opacity: 0.7 }}>🧠</span>
        </div>
      )}
      <FaceOverlay />
      <button
        className="pip__collapse"
        onClick={() => setCollapsed(true)}
        title="Hide camera preview"
        aria-label="Hide camera preview"
      >
        ▾
      </button>
      <div className="pip__tag">
        <span className="pip__dot" style={{ background: status.simulated ? '#e0179c' : '#ef4444' }} />
        <span ref={labelRef}>TRACKING</span>
        {status.simulated && <span style={{ marginLeft: 'auto', opacity: 0.8 }}>SIM</span>}
      </div>
    </div>
  );
}

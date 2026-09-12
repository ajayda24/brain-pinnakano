import { useEffect, useRef } from 'react';

const reduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * One-shot burst for the final verdict. `intensity` scales with how bad the
 * പിണ്ണാക്ക് score is, because a worse result deserves a bigger celebration.
 */
export function ConfettiBurst({
  intensity = 1,
  colors = ['#f59e0b', '#2563ff', '#e0179c', '#00b8d4', '#7c3aed'],
  emoji = ['🐄', '🧠', '☕'],
}: {
  intensity?: number;
  colors?: string[];
  emoji?: string[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs || reduced()) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = cvs.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    cvs.width = w * dpr;
    cvs.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const n = Math.round(90 * Math.max(0.3, intensity));
    const parts = Array.from({ length: n }, () => {
      const useEmoji = Math.random() < 0.14;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
      const speed = 6 + Math.random() * 11 * intensity;
      return {
        x: w / 2 + (Math.random() - 0.5) * w * 0.35,
        y: h * 0.55,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.32,
        size: useEmoji ? 16 + Math.random() * 12 : 4 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        glyph: useEmoji ? emoji[Math.floor(Math.random() * emoji.length)] : null,
        life: 1,
      };
    });

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(40, now - last) / 16.67;
      last = now;
      ctx.clearRect(0, 0, w, h);
      let alive = 0;
      for (const p of parts) {
        p.vy += 0.42 * dt;
        p.vx *= 0.992;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y > h * 0.62) p.life -= 0.014 * dt;
        if (p.life <= 0) continue;
        alive++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.glyph) {
          ctx.font = `${p.size}px serif`;
          ctx.textAlign = 'center';
          ctx.fillText(p.glyph, 0, 0);
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }
      if (alive > 0) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [intensity, colors, emoji]);

  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 40,
      }}
    />
  );
}

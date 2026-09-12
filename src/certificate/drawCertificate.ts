/**
 * Draws the certificate directly onto a canvas.
 *
 * Deliberately NOT html2canvas: that library mangles backdrop-filter, gradient
 * text and color-mix(), all of which this design leans on. Drawing by hand also
 * means the exported PNG is pixel-identical to what the user sees.
 *
 * MALAYALAM: canvas fillText does full shaping (conjuncts, combining marks) as
 * long as the font is actually loaded — hence `ensureFonts()` before any draw.
 * Letter-spacing is applied ONLY to Latin/mono runs; forcing tracking onto a
 * Malayalam run pushes combining marks off their base glyphs.
 */

import type { FinalReport } from '../state/report';

export const CERT_W = 1240;
export const CERT_H = 1754; // A4-ish proportions
const SCALE = 2;

const ML = '"Anek Malayalam Variable", "Noto Sans Malayalam", "Nirmala UI", sans-serif';
const UI = '"Space Grotesk Variable", "Segoe UI", system-ui, sans-serif';
const MONO = '"JetBrains Mono Variable", ui-monospace, Consolas, monospace';

/* Pastel palette, matching the app. GOLD is the document's rule/seal ink. */
const INK = '#1b2340';
const INK2 = '#5a6386';
const INK3 = '#868ea9';
const GOLD = '#6b56c8';
const AMBER = '#bd8433';
const BLUE = '#2f6fd0';

/** The fonts must be resident before fillText, or glyphs silently fall back. */
export async function ensureFonts() {
  if (!('fonts' in document)) return;
  const faces = [
    `700 64px ${ML}`,
    `600 30px ${ML}`,
    `400 22px ${ML}`,
    `700 72px ${UI}`,
    `600 28px ${UI}`,
    `400 20px ${UI}`,
    `700 22px ${MONO}`,
    `500 16px ${MONO}`,
  ];
  await Promise.all(
    faces.map((f) => document.fonts.load(f).catch(() => undefined)),
  );
  await document.fonts.ready;
}

interface TextOpts {
  font: string;
  color?: string;
  align?: CanvasTextAlign;
  /** only ever pass this for Latin/mono text — see the note at the top */
  tracking?: number;
  baseline?: CanvasTextBaseline;
  maxWidth?: number;
}

function drawText(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, o: TextOpts) {
  ctx.save();
  ctx.font = o.font;
  ctx.fillStyle = o.color ?? INK;
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = o.baseline ?? 'alphabetic';
  if (o.tracking && 'letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${o.tracking}px`;
  }
  if (o.maxWidth) ctx.fillText(str, x, y, o.maxWidth);
  else ctx.fillText(str, x, y);
  ctx.restore();
}

/** Shrinks the font until the string fits, so long names never overflow. */
function fitText(
  ctx: CanvasRenderingContext2D,
  str: string,
  maxWidth: number,
  startPx: number,
  weight: number,
  family: string,
) {
  let px = startPx;
  for (; px > 18; px -= 2) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(str).width <= maxWidth) break;
  }
  return `${weight} ${px}px ${family}`;
}

/* ------------------------------------------------------ security printing */

/** Sine-woven band, the way a banknote border is engraved. */
function guillocheBand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  lines = 7,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.7;
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < lines; i++) {
    const phase = (i / lines) * Math.PI * 2;
    const amp = h / 2 - 1;
    ctx.beginPath();
    for (let px = 0; px <= w; px += 2) {
      const t = (px / w) * Math.PI * 18;
      const py = y + h / 2 + Math.sin(t + phase) * amp * Math.cos(t * 0.22 + phase * 0.5);
      if (px === 0) ctx.moveTo(x + px, py);
      else ctx.lineTo(x + px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Rosette for the seal — two interleaved parametric curves. */
function rosette(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.6;
  ctx.globalAlpha = 0.55;
  for (let k = 5; k <= 9; k += 2) {
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.02; a += 0.012) {
      const r = R * 0.7 + Math.cos(a * k) * R * 0.2;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

/** Text bent around a circle, for the seal ring. */
function arcText(
  ctx: CanvasRenderingContext2D,
  str: string,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  font: string,
  color: string,
) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Latin only — per-character rotation would destroy Malayalam shaping.
  const chars = [...str];
  const total = chars.reduce((a, c) => a + ctx.measureText(c).width, 0);
  const arc = total / radius;
  let angle = startAngle - arc / 2;
  for (const c of chars) {
    const w = ctx.measureText(c).width;
    angle += w / 2 / radius;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(c, 0, 0);
    ctx.restore();
    angle += w / 2 / radius;
  }
  ctx.restore();
}

/** Decorative data-block. Not a QR code and not pretending to be one. */
function dataBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number) {
  const cells = 11;
  const c = size / cells;
  let s = seed;
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  ctx.save();
  ctx.fillStyle = INK;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const corner = (i < 3 && j < 3) || (i < 3 && j > cells - 4) || (i > cells - 4 && j < 3);
      if (corner ? (i === 0 || j === 0 || i === 2 || j === 2) : rand() > 0.52) {
        ctx.fillRect(x + i * c, y + j * c, c * 0.92, c * 0.92);
      }
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ main */

export async function drawCertificate(canvas: HTMLCanvasElement, r: FinalReport) {
  await ensureFonts();

  canvas.width = CERT_W * SCALE;
  canvas.height = CERT_H * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

  const W = CERT_W;
  const H = CERT_H;
  const cx = W / 2;

  /* ---- paper ---- */
  const paper = ctx.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, '#ffffff');
  paper.addColorStop(0.5, '#fbfcfe');
  paper.addColorStop(1, '#f5f7fc');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);

  // faint corner tints, so the paper is not dead flat
  const tint = ctx.createRadialGradient(W * 0.12, H * 0.08, 0, W * 0.12, H * 0.08, W * 0.7);
  tint.addColorStop(0, 'rgba(47,111,208,.06)');
  tint.addColorStop(1, 'rgba(47,111,208,0)');
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, W, H);
  const tint2 = ctx.createRadialGradient(W * 0.9, H * 0.95, 0, W * 0.9, H * 0.95, W * 0.7);
  tint2.addColorStop(0, 'rgba(107,86,200,.07)');
  tint2.addColorStop(1, 'rgba(107,86,200,0)');
  ctx.fillStyle = tint2;
  ctx.fillRect(0, 0, W, H);

  /* ---- border ---- */
  const M = 42;
  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(M, M, W - M * 2, H - M * 2);
  ctx.lineWidth = 0.8;
  ctx.strokeRect(M + 9, M + 9, W - (M + 9) * 2, H - (M + 9) * 2);
  ctx.globalAlpha = 1;

  guillocheBand(ctx, M + 14, M + 15, W - (M + 14) * 2, 22, GOLD);
  guillocheBand(ctx, M + 14, H - M - 37, W - (M + 14) * 2, 22, GOLD);

  /* ---- header ---- */
  let y = 158;
  drawText(ctx, '🧠', cx, y, { font: `400 54px ${UI}` });
  y += 56;
  drawText(ctx, 'OFFICIAL PINNAKK CERTIFICATE', cx, y, {
    font: `700 30px ${UI}`,
    color: INK,
    tracking: 3.2,
  });
  y += 26;
  drawText(ctx, 'ISSUED BY THE PINNAKK DIAGNOSTIC AUTHORITY · DEPT. OF തല', cx, y, {
    font: `500 12px ${MONO}`,
    color: INK3,
  });

  // holographic rule
  y += 24;
  // three solid pastel segments instead of a holographic sweep
  const seg = 520 / 3;
  ['#2f6fd0', '#6b56c8', '#bd8433'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(cx - 260 + i * seg, y, seg - 4, 3);
  });

  /* ---- citation ---- */
  y += 62;
  drawText(ctx, 'This certifies that', cx, y, { font: `400 20px ${UI}`, color: INK2 });

  y += 68;
  ctx.font = fitText(ctx, r.name, W - 240, 60, 700, UI);
  drawText(ctx, r.name.toUpperCase(), cx, y, { font: ctx.font, color: INK });

  // underline beneath the name
  ctx.strokeStyle = 'rgba(27,35,64,.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 260, y + 18);
  ctx.lineTo(cx + 260, y + 18);
  ctx.stroke();

  y += 62;
  drawText(ctx, 'has successfully completed the', cx, y, { font: `400 20px ${UI}`, color: INK2 });

  y += 56;
  // Malayalam title — no tracking, so conjuncts stay intact
  ctx.font = fitText(ctx, 'നിന്റെ തലയിൽ പിണ്ണാക്കാണോ?', W - 200, 46, 700, ML);
  drawText(ctx, 'നിന്റെ തലയിൽ പിണ്ണാക്കാണോ?', cx, y, { font: ctx.font, color: GOLD });

  y += 40;
  drawText(ctx, 'Brain Diagnostic Experience', cx, y, { font: `400 20px ${UI}`, color: INK2 });

  /* ---- score ---- */
  y += 78;
  drawText(ctx, 'പിണ്ണാക്ക് SCORE', cx, y, { font: `600 15px ${ML}`, color: INK3 });

  y += 96;
  drawText(ctx, `${r.pinnakk}`, cx - 26, y, {
    font: `700 116px ${UI}`,
    color: r.pinnakk >= 80 ? AMBER : BLUE,
    align: 'right',
  });
  drawText(ctx, ` / 100`, cx - 18, y, { font: `500 34px ${MONO}`, color: INK3, align: 'left' });

  /* ---- classification badge ---- */
  y += 56;
  const badge = `${r.classification.emoji}  ${r.classification.title}`;
  ctx.font = `700 26px ${ML}`;
  const bw = Math.min(W - 200, ctx.measureText(badge).width + 64);
  const bx = cx - bw / 2;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(bx, y - 30, bw, 52, 26);
  ctx.fillStyle = 'rgba(107,86,200,.09)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(107,86,200,.3)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
  drawText(ctx, badge, cx, y + 4, { font: `700 26px ${ML}`, color: GOLD });

  /* ---- statistics ---- */
  y += 92;
  ctx.strokeStyle = 'rgba(27,35,64,.11)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(M + 90, y - 30);
  ctx.lineTo(W - M - 90, y - 30);
  ctx.stroke();

  drawText(ctx, 'RECORDED MEASUREMENTS', cx, y, {
    font: `600 12px ${MONO}`,
    color: INK3,
    tracking: 2.4,
  });

  y += 34;
  const stats: [string, number][] = [
    ['Brain CPU', r.brainCpu],
    ['Brain RAM', r.brainRam],
    ['Motivation', r.motivation],
    ['Attention', r.attention],
    ['Overthinking', r.overthinking],
    ['Common Sense', r.commonSense],
  ];
  const colL = M + 110;
  const colR = W - M - 110;
  const rowH = 40;

  stats.forEach(([label, value], i) => {
    const ry = y + i * rowH;
    drawText(ctx, label, colL, ry, { font: `400 18px ${UI}`, color: INK2, align: 'left' });

    // Dotted leader from a fixed column, so every row lines up. (Measuring the
    // label here would use whatever font was last set, not the label's own.)
    ctx.save();
    ctx.strokeStyle = 'rgba(27,35,64,.2)';
    ctx.setLineDash([1.5, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(colL + 170, ry - 5);
    ctx.lineTo(colR - 150, ry - 5);
    ctx.stroke();
    ctx.restore();

    // mini bar
    const barW = 82;
    const barX = colR - barW - 52;
    ctx.fillStyle = 'rgba(27,35,64,.08)';
    ctx.beginPath();
    ctx.roundRect(barX, ry - 13, barW, 8, 4);
    ctx.fill();
    ctx.fillStyle = value > 70 ? AMBER : BLUE;
    ctx.beginPath();
    ctx.roundRect(barX, ry - 13, Math.max(3, (value / 100) * barW), 8, 4);
    ctx.fill();

    drawText(ctx, `${value.toString().padStart(2, '0')}%`, colR, ry, {
      font: `700 18px ${MONO}`,
      color: INK,
      align: 'right',
    });
  });

  y += stats.length * rowH + 18;
  drawText(ctx, `Measured പിണ്ണാക്ക് mass: ${r.pinnakkKg.toFixed(1)} KG (fictional)`, cx, y, {
    font: `400 15px ${ML}`,
    color: INK3,
  });

  /* ---- closing line ---- */
  y += 66;
  drawText(ctx, "Congratulations. Please don't improve.", cx, y, {
    font: `600 26px ${UI}`,
    color: INK,
  });

  // divider between the citation and the authentication furniture
  y += 34;
  ctx.save();
  ctx.strokeStyle = 'rgba(27,35,64,.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(M + 110, y);
  ctx.lineTo(W - M - 110, y);
  ctx.stroke();
  ctx.restore();

  /* ---- authentication block ----
     Everything below is positioned from the foot of the page so the lower
     third stays balanced no matter how tall the citation above it ran. */
  const footBase = H - M - 44; // just above the bottom guilloche band
  const microY = footBase + 16;
  const issuedY = footBase - 6;
  const taglineY = issuedY - 22;
  const brandY = taglineY - 22;
  const noteY = brandY - 30;
  const sealY = noteY - 118;

  /* seal */
  const sealX = W - M - 152;
  const R0 = 80;
  ctx.save();
  ctx.beginPath();
  ctx.arc(sealX, sealY, R0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(107,86,200,.09)';
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sealX, sealY, R0 - 9, 0, Math.PI * 2);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
  rosette(ctx, sealX, sealY, R0 - 16, GOLD);
  arcText(ctx, 'PINNAKK DIAGNOSTIC AUTHORITY', sealX, sealY, R0 - 20, -Math.PI / 2, `700 11px ${MONO}`, GOLD);
  arcText(ctx, 'SCIENTIFICALLY UNNECESSARY', sealX, sealY, R0 - 20, Math.PI / 2, `700 10px ${MONO}`, GOLD);
  drawText(ctx, '🐄', sealX, sealY + 14, { font: `400 38px ${UI}` });

  /* signature */
  const sigX = M + 196;
  const sigY = sealY + 6;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // a suitably illegible official squiggle
  ctx.moveTo(sigX - 110, sigY);
  for (let i = 0; i <= 220; i += 4) {
    const t = i / 220;
    ctx.lineTo(
      sigX - 110 + i,
      sigY - Math.sin(t * Math.PI * 3.4) * 22 * (1 - t * 0.45) - Math.sin(t * 31) * 2.2,
    );
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(27,35,64,.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sigX - 120, sigY + 18);
  ctx.lineTo(sigX + 120, sigY + 18);
  ctx.stroke();
  drawText(ctx, 'CHIEF പിണ്ണാക്ക് OFFICER', sigX, sigY + 42, {
    font: `500 12px ${ML}`,
    color: INK3,
  });

  /* decorative data block, tucked under the signature */
  dataBlock(ctx, M + 34, sigY + 58, 66, r.pinnakk * 7919 + r.date.getSeconds());

  /* footer */
  drawText(ctx, 'This is a parody certificate. It measures nothing and means nothing.', cx, noteY, {
    font: `400 12px ${UI}`,
    color: INK3,
  });
  drawText(ctx, 'PINNAKK OS™', cx, brandY, { font: `700 17px ${UI}`, color: INK, tracking: 2 });
  drawText(ctx, 'Scientifically unnecessary. Technically impressive.', cx, taglineY, {
    font: `400 14px ${UI}`,
    color: INK2,
  });

  const issued = r.date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const serial = `PK-${r.date.getFullYear()}-${String(r.pinnakk).padStart(3, '0')}-${r.date
    .getTime()
    .toString(36)
    .slice(-5)
    .toUpperCase()}`;
  drawText(ctx, `Issued ${issued}   ·   Certificate No. ${serial}`, cx, issuedY, {
    font: `500 12px ${MONO}`,
    color: INK3,
  });

  /* microtext, threaded through the bottom band */
  ctx.save();
  ctx.globalAlpha = 0.45;
  drawText(
    ctx,
    'THISCERTIFICATEISAJOKEANDCONFERSNORIGHTSPRIVILEGESORDIAGNOSESWHATSOEVER·'.repeat(3),
    cx,
    microY,
    { font: `400 5px ${MONO}`, color: INK3, maxWidth: W - M * 2 - 40 },
  );
  ctx.restore();
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

import { useApp } from '../state/store';
import { getLastReport } from '../state/reportStore';
import { buildReport, shareText, type FinalReport } from '../state/report';
import { drawCertificate, CERT_H, CERT_W } from '../certificate/drawCertificate';
import { Chip } from '../components/ui/primitives';

type Status = { kind: 'idle' | 'ok' | 'err'; message?: string };

export function Certificate() {
  const setStage = useApp((s) => s.setStage);
  const userName = useApp((s) => s.userName);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  // If someone lands here directly, generate a report rather than showing nothing.
  const reportRef = useRef<FinalReport | null>(null);
  if (!reportRef.current) reportRef.current = getLastReport() ?? buildReport(userName);
  const report = reportRef.current;

  useEffect(() => {
    let cancelled = false;
    const cvs = canvasRef.current;
    if (!cvs) return;
    setDrawing(true);
    drawCertificate(cvs, report)
      .then(() => {
        if (!cancelled) setDrawing(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setDrawing(false);
        setStatus({ kind: 'err', message: `Could not render the certificate: ${err.message}` });
      });
    return () => {
      cancelled = true;
    };
  }, [report]);

  const fileName = `pinnakk-certificate-${report.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'subject'}.png`;

  const toBlob = useCallback(
    () =>
      new Promise<Blob>((resolve, reject) => {
        const cvs = canvasRef.current;
        if (!cvs) return reject(new Error('canvas not ready'));
        cvs.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('canvas could not be encoded'))),
          'image/png',
        );
      }),
    [],
  );

  const download = async () => {
    try {
      const blob = await toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // revoke on the next turn so the download has definitely started
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setStatus({ kind: 'ok', message: 'Certificate downloaded.' });
    } catch (err) {
      setStatus({ kind: 'err', message: (err as Error).message });
    }
  };

  const share = async () => {
    const text = shareText(report);
    try {
      const blob = await toBlob();
      const file = new File([blob], fileName, { type: 'image/png' });

      // Share the image itself where the browser supports it...
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: 'PINNAKK OS™ Certificate', text });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: 'PINNAKK OS™ Certificate', text });
        return;
      }
      // ...otherwise put the summary on the clipboard and hand over the PNG.
      await navigator.clipboard?.writeText(text);
      setStatus({ kind: 'ok', message: 'Result copied to clipboard — download the image to share it.' });
    } catch (err) {
      const e = err as Error;
      if (e.name === 'AbortError') return; // user dismissed the share sheet
      setStatus({ kind: 'err', message: 'Sharing is not available here. Use Download instead.' });
    }
  };

  return (
    <div className="cert">
      <motion.div
        className="cert__inner"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="cert__header">
          <div>
            <h2 className="cert__title">🧾 Certificate issued</h2>
            <p className="fine">
              Rendered at {CERT_W * 2}×{CERT_H * 2} for printing, framing, or regret.
            </p>
          </div>
          <Chip color="var(--amber)">{report.classification.title}</Chip>
        </div>

        <motion.div
          className="cert__paper"
          initial={{ rotateX: 8, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          {drawing && (
            <div className="cert__loading">
              <span className="label">Engraving certificate…</span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="cert__canvas"
            style={{ aspectRatio: `${CERT_W} / ${CERT_H}`, opacity: drawing ? 0.25 : 1 }}
            aria-label={`Pinnakk certificate for ${report.name}, score ${report.pinnakk} out of 100`}
          />
        </motion.div>

        <div className="cert__actions">
          <button className="btn btn--primary" onClick={download} disabled={drawing}>
            📥 Download certificate
          </button>
          <button className="btn" onClick={share} disabled={drawing}>
            🔗 Share result
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setStage('final')}>
            ← Back to report
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setStage('desktop')}>
            🧠 Keep testing
          </button>
        </div>

        {status.kind !== 'idle' && (
          <p
            className="fine"
            style={{ color: status.kind === 'err' ? 'var(--red)' : 'var(--green)' }}
            role="status"
          >
            {status.message}
          </p>
        )}

        <p className="disclaimer" style={{ maxWidth: 640 }}>
          <span>🐄</span>
          <span>
            This certificate is a joke. It certifies nothing, measures nothing, and should not be
            shown to a doctor, an employer, or your mother.
          </span>
        </p>
      </motion.div>
    </div>
  );
}

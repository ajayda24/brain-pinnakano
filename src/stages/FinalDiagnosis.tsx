import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { useApp } from '../state/store';
import { metrics } from '../state/metricsEngine';
import { buildReport, type FinalReport } from '../state/report';
import { setLastReport } from '../state/reportStore';
import { ConfettiBurst } from '../components/ui/Particles';
import { TerminalLines } from '../components/ui/Typewriter';
import { BlockBar } from '../components/ui/primitives';

const RECOMPUTE = [
  { text: 'Halting all brain processes...', pause: 200 },
  { text: 'Collecting പിണ്ണാക്ക് samples...', className: 'warn', pause: 240 },
  { text: 'Cross-referencing against nothing...', pause: 200 },
  { text: 'Weighing തല (approximate)...', pause: 240 },
  { text: 'Applying entirely made-up formula...', className: 'warn', pause: 260 },
  { text: 'FINALISING DIAGNOSIS', className: 'hi', pause: 400 },
];

/** Big number that counts up to the final score. */
function ScoreCounter({ to, onDone }: { to: number; onDone?: () => void }) {
  const [n, setN] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const DUR = 1800;
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / DUR);
      // slow, deliberate settle — it should feel like a verdict
      const eased = 1 - Math.pow(1 - t, 3.2);
      setN(eased * to);
      if (t < 1) raf = requestAnimationFrame(frame);
      else done.current?.();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [to]);

  return <>{Math.round(n)}</>;
}

export function FinalDiagnosis() {
  const setStage = useApp((s) => s.setStage);
  const userName = useApp((s) => s.userName);
  const [phase, setPhase] = useState<'computing' | 'reveal'>('computing');
  const [burst, setBurst] = useState(false);

  const report = useMemo<FinalReport>(() => buildReport(userName), [userName]);

  useEffect(() => {
    setLastReport(report);
    metrics.setPaused(true);
    return () => metrics.setPaused(false);
  }, [report]);

  const rows = [
    { label: 'Brain CPU', value: report.brainCpu, color: 'var(--blue)' },
    { label: 'Brain RAM', value: report.brainRam, color: 'var(--violet)' },
    { label: 'Motivation', value: report.motivation, color: 'var(--red)' },
    { label: 'Attention', value: report.attention, color: 'var(--cyan)' },
    { label: 'Overthinking', value: report.overthinking, color: 'var(--magenta)' },
    { label: 'Common Sense', value: report.commonSense, color: 'var(--green)' },
  ];

  return (
    <div className="final">
      {burst && <ConfettiBurst intensity={0.5 + report.pinnakk / 70} />}

      <AnimatePresence mode="wait">
        {phase === 'computing' ? (
          <motion.div
            key="computing"
            className="final__computing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <TerminalLines
              lines={RECOMPUTE}
              className="term final__term"
              onDone={() => window.setTimeout(() => setPhase('reveal'), 420)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="reveal"
            className="final__card"
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="final__rule" />
            <div className="final__heading">FINAL BRAIN REPORT</div>

            <div className="final__scorelabel label">പിണ്ണാക്ക് LEVEL</div>
            <div className="final__score" style={{ color: report.classification.color }}>
              <ScoreCounter to={report.pinnakk} onDone={() => setBurst(true)} />
              <span className="final__pct">%</span>
            </div>

            <motion.div
              className="final__classification"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.7, type: 'spring', stiffness: 300, damping: 22 }}
              style={{
                color: report.classification.color,
                borderColor: `color-mix(in srgb, ${report.classification.color} 34%, transparent)`,
                background: `color-mix(in srgb, ${report.classification.color} 10%, transparent)`,
              }}
            >
              <span className="final__classemoji">{report.classification.emoji}</span>
              <span className="ml">{report.classification.title}</span>
            </motion.div>

            <motion.p
              className="final__verdict"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
            >
              {report.classification.verdict}
            </motion.p>

            <motion.div
              className="final__rows"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.15, duration: 0.5 }}
            >
              {rows.map((r) => (
                <div key={r.label} className="final__row">
                  <span className="final__rowlabel">{r.label}</span>
                  <BlockBar value={r.value} width={14} color={r.color} />
                  <span className="final__rowval mono" style={{ color: r.color }}>
                    {r.value.toString().padStart(2, '0')}%
                  </span>
                </div>
              ))}
            </motion.div>

            <motion.div
              className="final__highlights"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.4 }}
            >
              {report.highlights.map((h) => (
                <div key={h.label} className="final__hl">
                  <span className="final__hlval mono">{h.value}</span>
                  <span className="final__hllabel">{h.label}</span>
                </div>
              ))}
            </motion.div>

            <motion.div
              className="final__actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.6 }}
            >
              <button className="btn btn--primary" onClick={() => setStage('certificate')}>
                🧾 Issue certificate
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setStage('desktop')}>
                ← Back to diagnostics
              </button>
            </motion.div>

            <p className="fine final__disclaimer">
              This report is fictional. It is not a measurement of intelligence, personality, or
              health, and it means nothing at all outside this joke.
            </p>
            <div className="final__rule" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

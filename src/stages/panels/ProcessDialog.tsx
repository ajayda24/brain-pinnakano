import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../state/store';
import { metrics } from '../../state/metricsEngine';
import { END_TASK_STEPS } from '../../config/processes';
import { session } from '../../state/session';
import { LiveNumber } from '../../components/ui/live';
import { Chip } from '../../components/ui/primitives';

type Phase = 'idle' | 'ending' | 'refused' | 'killed';

export function ProcessDialog() {
  const id = useApp((s) => s.selectedProcess);
  const proc = useApp((s) => s.processes.find((p) => p.id === s.selectedProcess));
  const close = () => useApp.getState().selectProcess(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState(0);
  const timers = useRef<number[]>([]);

  // reset whenever a different process is opened
  useEffect(() => {
    setPhase('idle');
    setStep(0);
    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, [id]);

  if (!proc) return null;

  const endTask = () => {
    if (phase !== 'idle') return;
    session.endTaskAttempts += 1;
    setPhase('ending');
    setStep(0);

    END_TASK_STEPS.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setStep(i + 1), (i + 1) * 780));
    });

    timers.current.push(
      window.setTimeout(
        () => {
          if (proc.killable) {
            setPhase('killed');
            useApp.getState().endProcess(proc.id);
            session.killedActualWork = true;
            metrics.bumpPinnakk(+6.5, 'ActualWork.exe terminated');
          } else {
            setPhase('refused');
          }
        },
        (END_TASK_STEPS.length + 1) * 780,
      ),
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        key="proc-modal"
        className="modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      >
        <motion.div
          className="modal__card"
          initial={{ scale: 0.94, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 10 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal__head">
            <h2 className="modal__title">Process diagnostics</h2>
            <span className="panel__spacer" />
            <button className="iconbtn" onClick={close} aria-label="Close">
              ✕
            </button>
          </div>

          <div className="panel__body">
            <div className="pd__name">{proc.name}</div>

            <div className="pd__stats">
              <div className="statrow">
                <span className="statrow__label">CPU</span>
                <span className="statrow__dots" />
                <LiveNumber
                  select={(s) => s.cpu[proc.id] ?? 0}
                  format={(n) => `${n.toFixed(0)}%`}
                  className="statrow__value mono"
                />
              </div>
              <div className="statrow">
                <span className="statrow__label">RAM</span>
                <span className="statrow__dots" />
                <span className="statrow__value mono">{proc.ram.toFixed(1)} GB</span>
              </div>
              <div className="statrow">
                <span className="statrow__label">Running since</span>
                <span className="statrow__dots" />
                <span className="statrow__value mono">{proc.since}</span>
              </div>
            </div>

            <div className="pd__statusblock">
              <div className="label">Status</div>
              <div
                className="pd__status"
                style={{
                  color: proc.ended
                    ? 'var(--ink-3)'
                    : proc.status
                      ? 'var(--red)'
                      : 'var(--ink)',
                }}
              >
                {proc.ended ? 'TERMINATED' : (proc.status ?? proc.statusNow).toUpperCase()}
              </div>
            </div>

            {/* ---- the attempt ---- */}
            <AnimatePresence mode="wait">
              {phase === 'ending' && (
                <motion.div
                  key="ending"
                  className="term pd__term"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0 }}
                >
                  {END_TASK_STEPS.slice(0, step).map((s) => (
                    <div key={s}>{s}</div>
                  ))}
                  <div>
                    <span className="caret" />
                  </div>
                </motion.div>
              )}

              {phase === 'refused' && (
                <motion.div
                  key="refused"
                  className="pd__error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                >
                  <div className="pd__errcode">ERROR 403</div>
                  <p className="pd__errtext ml">{proc.refusal}</p>
                </motion.div>
              )}

              {phase === 'killed' && (
                <motion.div
                  key="killed"
                  className="pd__killed"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="pd__killedcode">PROCESS ENDED</div>
                  <p className="pd__errtext">
                    ActualWork.exe is gone. പിണ്ണാക്ക് level rising. This was, of course,
                    the only process you were able to stop.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="row" style={{ marginTop: 16, gap: 10 }}>
              <button
                className="btn btn--danger"
                style={{ flex: 1 }}
                onClick={endTask}
                disabled={phase !== 'idle' || proc.ended}
              >
                {proc.ended ? 'Already ended' : phase === 'idle' ? '[ End task ]' : 'Working…'}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={close}>
                Close
              </button>
            </div>

            {proc.killable && phase === 'idle' && (
              <div style={{ marginTop: 10 }}>
                <Chip color="var(--green)">This one will actually end</Chip>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

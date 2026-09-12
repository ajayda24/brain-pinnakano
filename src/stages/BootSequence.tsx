import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../state/store';
import { Typewriter } from '../components/ui/Typewriter';

interface Step {
  label: string;
  target: number;
  ms: number;
  color: string;
  /** progress curve 0..1 -> 0..1; this is where the jokes live */
  ease?: (t: number) => number;
  note?: string;
}

const smooth = (t: number) => 1 - Math.pow(1 - t, 2.4);
/** races ahead, then loses its nerve near the end */
const hesitant = (t: number) => (t < 0.55 ? t * 1.55 : 0.85 + (t - 0.55) * 0.33);
/** three false starts, because common sense does not load easily */
const stalling = (t: number) => {
  if (t < 0.25) return t * 2.6;
  if (t < 0.62) return 0.65 + Math.sin((t - 0.25) * 24) * 0.03;
  return 0.68 + (t - 0.62) * 0.84;
};
/** gives up almost immediately */
const doomed = (t: number) => Math.min(1, Math.pow(t, 0.35) * 0.98);

const STEPS: Step[] = [
  { label: 'Loading brain modules...', target: 87, ms: 1500, color: 'var(--blue)', ease: smooth },
  {
    label: 'Loading common sense...',
    target: 23,
    ms: 1900,
    color: 'var(--amber)',
    ease: stalling,
    note: 'retrying...',
  },
  {
    label: 'Loading motivation...',
    target: 4,
    ms: 1400,
    color: 'var(--red)',
    ease: doomed,
    note: 'giving up',
  },
  { label: 'Mounting ചായ subsystem...', target: 96, ms: 900, color: 'var(--cyan)', ease: hesitant },
  {
    label: 'Searching for പിണ്ണാക്ക്...',
    target: 100,
    ms: 1500,
    color: 'var(--magenta)',
    ease: smooth,
    note: 'found. abundant.',
  },
];

const WIDTH = 18;

function BootBar({ step, onDone }: { step: Step; onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const [showNote, setShowNote] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const curve = step.ease ?? smooth;
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / step.ms);
      setPct(Math.max(0, Math.min(step.target, curve(t) * step.target)));
      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        setShowNote(true);
        window.setTimeout(() => doneRef.current(), 260);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  const filled = Math.round((pct / 100) * WIDTH);
  return (
    <div className="boot__step">
      <div className="boot__label">
        {step.label}
        {showNote && step.note && <span className="boot__note"> {step.note}</span>}
      </div>
      <div className="boot__barline">
        <span className="blockbar" style={{ ['--c' as string]: step.color }}>
          {'█'.repeat(filled)}
          <span className="off">{'░'.repeat(WIDTH - filled)}</span>
        </span>
        <span className="boot__pct mono" style={{ color: step.color }}>
          {Math.round(pct).toString().padStart(3, ' ')}%
        </span>
      </div>
    </div>
  );
}

export function BootSequence() {
  const setStage = useApp((s) => s.setStage);
  const [phase, setPhase] = useState<'header' | 'steps' | 'ready'>('header');
  const [index, setIndex] = useState(0);

  const skip = () => setStage('intro');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'ready') return;
    const t = window.setTimeout(() => setStage('intro'), 1400);
    return () => window.clearTimeout(t);
  }, [phase, setStage]);

  return (
    <div className="boot" onClick={skip}>
      <motion.div
        className="boot__panel"
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="boot__brandrow">
          <span className="boot__logo">🧠</span>
          <div>
            <div className="boot__brand">
              PINNAKK OS<sup>™</sup>
            </div>
            <div className="boot__ver mono">v1.0.26</div>
          </div>
        </div>

        <div className="boot__init mono">
          <Typewriter
            text="Initializing Human Runtime Environment..."
            speed={17}
            caret
            onDone={() => setPhase('steps')}
          />
        </div>

        {phase !== 'header' && (
          <div className="boot__steps">
            {STEPS.slice(0, index + 1).map((s, i) => (
              <BootBar
                key={s.label}
                step={s}
                onDone={() => {
                  if (i !== index) return;
                  if (index + 1 < STEPS.length) setIndex(index + 1);
                  else setPhase('ready');
                }}
              />
            ))}
          </div>
        )}

        {phase === 'ready' && (
          <motion.div
            className="boot__ready"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            SYSTEM READY
          </motion.div>
        )}

        <div className="boot__skip fine">click anywhere to skip</div>
      </motion.div>
    </div>
  );
}

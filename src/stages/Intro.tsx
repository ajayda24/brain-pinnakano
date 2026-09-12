import { motion } from 'motion/react';
import { useApp } from '../state/store';
import { faceEngine } from '../face/faceEngine';
import { Chip } from '../components/ui/primitives';

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 22, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] as const },
}); 

export function Intro() {
  const setStage = useApp((s) => s.setStage);

  return (
    <div className="intro">
      <div className="intro__inner">
        <motion.div {...fade(0)}>
          <Chip color="var(--magenta)">🐄 Diagnostic build · not a real instrument</Chip>
        </motion.div>

        <motion.h1 className="intro__title ml" {...fade(0.12)}>
          നിന്റെ തലയിൽ
          <br />
          <span className="intro__title-hi">പിണ്ണാക്കാണോ?</span>
        </motion.h1>

        <motion.p className="intro__sub" {...fade(0.26)}>
          An unnecessarily advanced brain diagnostic system.
        </motion.p>

        <motion.div {...fade(0.4)}>
          <button className="btn btn--primary intro__cta" onClick={() => setStage('scan')}>
            <span style={{ fontSize: 18 }}>🧠</span>
            <span className="ml">Scan your brain</span>
          </button>
        </motion.div>

        <motion.div className="intro__notes" {...fade(0.55)}>
          <p className="disclaimer">
            <span>📷</span>
            <span>
              Camera permission required. Face analysis runs entirely in your browser — no frames
              are recorded, uploaded, or stored anywhere.
            </span>
          </p>
          <p className="disclaimer">
            <span>🐄</span>
            <span>
              This is a parody. Every measurement it produces is invented for comedy. It does not
              diagnose intelligence, personality, or any medical or psychological condition.
            </span>
          </p>
        </motion.div>

        <motion.div className="intro__skiprow" {...fade(0.68)}>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => {
              faceEngine.forceSimulation('You chose simulation mode — no camera is used.');
              setStage('scan');
            }}
          >
            No camera? Run in simulation mode →
          </button>
        </motion.div>
      </div>
    </div>
  );
}

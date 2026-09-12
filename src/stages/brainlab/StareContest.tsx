import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel, Chip } from '../../components/ui/primitives';
import { useFaceFrame } from '../../face/useFaceSignals';
import { metrics } from '../../state/metricsEngine';
import { session } from '../../state/session';

/**
 * GAME D — STARE CONTEST.
 *
 * The only game driven by the blink signal. A blink is unmistakable in the
 * blendshapes (both eyes closing together), so this is the most reliable of
 * the camera games — and the hardest to cheat, which is the joke.
 */

const BLINK_AT = 0.55;
/** ignore the first moment, or the blink you arrive mid-way through ends it */
const GRACE_MS = 700;

/** Escalating commentary while the user is staring. */
const TAUNTS: { at: number; text: string }[] = [
  { at: 0, text: 'കണ്ണ് അടയ്ക്കരുത്.' },
  { at: 3, text: 'Three seconds. Anyone can do three seconds.' },
  { at: 6, text: 'ഇപ്പോൾ കണ്ണ് നീറാൻ തുടങ്ങിയോ?' },
  { at: 9, text: 'Your eyes are negotiating with you. Do not listen.' },
  { at: 13, text: 'This is longer than most people manage.' },
  { at: 17, text: 'ഇത് ആരോഗ്യകരമല്ല.' },
  { at: 22, text: 'We are genuinely concerned now.' },
  { at: 28, text: 'Blink. Please. This was supposed to be a short game.' },
];

const RANKS: { min: number; title: string; note: string; color: string }[] = [
  { min: 25, title: 'ഇത് മനുഷ്യനല്ല', note: 'Report this subject to someone.', color: 'var(--red)' },
  { min: 16, title: 'STONE FACED', note: 'Unsettlingly committed.', color: 'var(--violet)' },
  { min: 10, title: 'RESPECTABLE', note: 'Above average. Barely.', color: 'var(--blue)' },
  { min: 5, title: 'AVERAGE HUMAN', note: 'Exactly as unremarkable as expected.', color: 'var(--cyan)' },
  { min: 2, title: 'ചെറിയ ശ്രമം', note: 'You tried. Technically.', color: 'var(--amber)' },
  { min: 0, title: 'INSTANT BLINK', note: 'That was not even an attempt.', color: 'var(--red)' },
];

const rankFor = (sec: number) => RANKS.find((r) => sec >= r.min) ?? RANKS[RANKS.length - 1];

type Phase = 'ready' | 'running' | 'done';

export function StareContest({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [elapsed, setElapsed] = useState(0);
  const [final, setFinal] = useState(0);
  const [taunt, setTaunt] = useState(TAUNTS[0].text);

  const startedAt = useRef(0);
  const phaseRef = useRef<Phase>('ready');
  phaseRef.current = phase;
  const moistureRef = useRef<HTMLDivElement>(null);

  const stop = useCallback((sec: number) => {
    if (phaseRef.current !== 'running') return;
    setFinal(sec);
    setPhase('done');
    session.games.stareContest = { seconds: sec };
    // staring blankly at a screen is, of course, pure പിണ്ണാക്ക്
    metrics.bumpPinnakk(Math.min(6, 1 + sec * 0.18));
    metrics.bumpMotivation(6);
  }, []);

  // blink watch — runs off the raw frame stream, not React state
  useFaceFrame((f) => {
    if (phaseRef.current !== 'running') return;
    const sec = (performance.now() - startedAt.current) / 1000;
    if (performance.now() - startedAt.current > GRACE_MS && f.signals.blink > BLINK_AT) {
      stop(sec);
    }
  });

  // clock + taunts + the draining "moisture" bar
  useEffect(() => {
    if (phase !== 'running') return;
    let raf = 0;
    const frame = () => {
      const sec = (performance.now() - startedAt.current) / 1000;
      setElapsed(sec);
      const t = [...TAUNTS].reverse().find((x) => sec >= x.at);
      if (t) setTaunt((cur) => (cur === t.text ? cur : t.text));
      if (moistureRef.current) {
        // purely decorative, and completely made up
        moistureRef.current.style.width = `${Math.max(0, 100 - sec * 3.2).toFixed(1)}%`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const begin = () => {
    startedAt.current = performance.now();
    setElapsed(0);
    setTaunt(TAUNTS[0].text);
    setPhase('running');
  };

  const rank = rankFor(final);

  return (
    <div className="game">
      <Panel
        title="Game D — Stare Contest"
        icon="👁️"
        right={<Chip color="var(--cyan)">Blink detection</Chip>}
      >
        <div className="game__stage">
          <AnimatePresence mode="wait">
            {phase === 'ready' && (
              <motion.div key="ready" className="game__intro" exit={{ opacity: 0 }}>
                <div className="game__bigicon">👁️</div>
                <h3 className="game__title">Do not blink.</h3>
                <p className="game__sub ml">കണ്ണ് ചിമ്മിയാൽ തീർന്നു.</p>
                <p className="fine" style={{ maxWidth: 400, textAlign: 'center' }}>
                  The clock stops the instant both eyes close. Looking away does not help — it
                  only makes you blink sooner.
                </p>
                <button className="btn btn--primary" onClick={begin}>
                  ▶ Start staring
                </button>
              </motion.div>
            )}

            {phase === 'running' && (
              <motion.div
                key="run"
                className="game__intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="stare__clock mono">{elapsed.toFixed(2)}</div>
                <div className="stare__unit">seconds without blinking</div>
                <motion.p
                  key={taunt}
                  className="game__sub ml"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ maxWidth: 420 }}
                >
                  {taunt}
                </motion.p>
              </motion.div>
            )}

            {phase === 'done' && (
              <motion.div
                key="done"
                className="game__result"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="game__bigicon">😑</div>
                <div className="game__verdict" style={{ color: rank.color }}>
                  {rank.title}
                </div>
                <div className="game__score">
                  <div className="label">Time without blinking</div>
                  <div className="game__scoreval mono">
                    {final.toFixed(2)}
                    <span className="game__scoremax">s</span>
                  </div>
                </div>
                <p className="game__sub">{rank.note}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {phase === 'running' && (
          <div className="game__meter">
            <span className="label">Corneal moisture</span>
            <div className="bar" style={{ ['--h' as string]: '9px', ['--c' as string]: 'var(--cyan)', flex: 1 }}>
              <div ref={moistureRef} className="bar__fill" style={{ width: '100%' }} />
            </div>
            <span className="fine">entirely fictional</span>
          </div>
        )}

        <div className="row" style={{ marginTop: 14, gap: 10 }}>
          {phase === 'done' && (
            <button className="btn btn--primary btn--sm" onClick={begin}>
              ↻ Again
            </button>
          )}
          <button className="btn btn--ghost btn--sm" onClick={onExit}>
            ← Back to Brain Lab
          </button>
        </div>
      </Panel>
    </div>
  );
}

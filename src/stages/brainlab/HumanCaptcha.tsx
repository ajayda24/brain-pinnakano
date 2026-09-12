import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CAPTCHA_PASS_LINES, drawCaptcha } from '../../config/captcha';
import { Panel, Chip } from '../../components/ui/primitives';
import { metrics } from '../../state/metricsEngine';
import { session } from '../../state/session';

export function HumanCaptcha({ onExit }: { onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  /** the "…and so was everything else" beat, a moment after the pick */
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0);
  const revealTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(revealTimer.current), []);

  // a fresh random draw per attempt, so replaying is not the same quiz
  const questions = useMemo(() => drawCaptcha(5), [round]);
  const passLine = useMemo(
    () => CAPTCHA_PASS_LINES[Math.floor(Math.random() * CAPTCHA_PASS_LINES.length)],
    [round],
  );

  const q = questions[index];
  const last = index >= questions.length - 1;

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    // Staged on purpose. Revealing every option as correct in the same frame
    // reads as a broken multi-select; landing the pick first, then the others,
    // reads as the punchline it is.
    window.clearTimeout(revealTimer.current);
    revealTimer.current = window.setTimeout(() => setRevealed(true), 650);
  };

  const advance = () => {
    if (last) {
      setDone(true);
      session.games.captcha = { answered: questions.length, passed: true };
      metrics.bumpPinnakk(2.5);
      metrics.bumpMotivation(10);
    } else {
      setIndex((n) => n + 1);
      setPicked(null);
      setRevealed(false);
    }
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setRevealed(false);
    setDone(false);
    setRound((r) => r + 1); // redraws the questions
  };

  return (
    <div className="game">
      <Panel
        title="Game C — Human Captcha"
        icon="🤖"
        right={
          <Chip color="var(--cyan)">
            {Math.min(index + 1, questions.length)} / {questions.length}
          </Chip>
        }
      >
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              className="game__result"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            >
              <div className="game__bigicon">🤖</div>
              <div className="game__verdict" style={{ color: 'var(--green)' }}>
                {passLine}
              </div>
              <p className="game__sub">
                You answered every question correctly, which was never in doubt, because every
                answer was correct.
              </p>
              <p className="fine" style={{ maxWidth: 400, textAlign: 'center' }}>
                No intelligence was tested here. There was nothing to fail.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.26 }}
            >
              <div className="cap__prompt ml">{q.prompt}</div>
              {q.sub && <p className="cap__sub fine">{q.sub}</p>}

              <div className="cap__grid">
                {q.options.map((o, i) => {
                  const mine = picked === i;
                  const alsoCorrect = revealed && !mine;
                  return (
                    <button
                      key={i}
                      className={[
                        'cap__opt',
                        mine ? 'cap__opt--picked' : '',
                        alsoCorrect ? 'cap__opt--also' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => choose(i)}
                      disabled={picked !== null}
                    >
                      <span className="cap__emoji">{o.emoji}</span>
                      <span className="cap__label ml">{o.label}</span>
                      {mine && <span className="cap__tag">Your answer</span>}
                      {alsoCorrect && <span className="cap__tag cap__tag--also">Also correct</span>}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {revealed && (
                  <motion.div
                    className="cap__reveal"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="cap__revealtitle">{q.reveal}</div>
                    <button className="btn btn--primary btn--sm" onClick={advance}>
                      {last ? 'Finish verification' : 'Next question →'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="row" style={{ marginTop: 16, gap: 10 }}>
          {done && (
            <button className="btn btn--primary btn--sm" onClick={restart}>
              ↻ Verify again
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

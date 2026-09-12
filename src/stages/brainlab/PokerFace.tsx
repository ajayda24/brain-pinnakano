import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { pokerFaceRounds } from '../../config/reels';
import { ReelPlayer } from '../../components/ReelPlayer';
import { Panel, Chip } from '../../components/ui/primitives';
import { useFaceFrame } from '../../face/useFaceSignals';
import { metrics } from '../../state/metricsEngine';
import { session } from '../../state/session';

export type Grade = 'PASS' | 'WARNING' | 'FAILED';

const ROUND_MS = 11000;
const ROUNDS = pokerFaceRounds(4);

const GRADE_STYLE: Record<Grade, { emoji: string; color: string }> = {
  PASS: { emoji: '😐', color: 'var(--green)' },
  WARNING: { emoji: '🙂', color: 'var(--amber)' },
  FAILED: { emoji: '😂', color: 'var(--red)' },
};

function gradeFor(peakSmile: number, peakLaugh: number): Grade {
  if (peakLaugh > 0.5 || peakSmile > 0.6) return 'FAILED';
  if (peakSmile > 0.3) return 'WARNING';
  return 'PASS';
}

type Phase = 'ready' | 'running' | 'between' | 'done';

export function PokerFace({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [round, setRound] = useState(0);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [score, setScore] = useState(0);

  const peakSmile = useRef(0);
  const peakLaugh = useRef(0);
  const phaseRef = useRef<Phase>('ready');
  phaseRef.current = phase;
  const roundTimer = useRef(0);

  useFaceFrame((f) => {
    if (phaseRef.current !== 'running') return;
    if (f.signals.smile > peakSmile.current) peakSmile.current = f.signals.smile;
    if (f.signals.laugh > peakLaugh.current) peakLaugh.current = f.signals.laugh;
  });

  useEffect(() => {
    metrics.setReelActivity(phase === 'running' ? 1 : 0);
    return () => metrics.setReelActivity(0);
  }, [phase]);

  useEffect(() => () => window.clearTimeout(roundTimer.current), []);

  const endRound = useCallback(() => {
    if (phaseRef.current !== 'running') return;
    window.clearTimeout(roundTimer.current);

    const g = gradeFor(peakSmile.current, peakLaugh.current);
    const next = [...grades, g];
    setGrades(next);

    if (next.length >= ROUNDS.length) {
      // each round is worth 25; partial credit for merely wobbling
      const total = next.reduce((a, x) => a + (x === 'PASS' ? 25 : x === 'WARNING' ? 11 : 2), 0);
      const final = Math.max(1, Math.min(100, total));
      setScore(final);
      setPhase('done');
      session.games.pokerFace = { rounds: next, score: final };
      metrics.bumpPinnakk(final < 40 ? 4 : -1.5);
      metrics.bumpMotivation(8);
    } else {
      setPhase('between');
      window.setTimeout(() => {
        setRound((r) => r + 1);
        peakSmile.current = 0;
        peakLaugh.current = 0;
        setPhase('running');
      }, 1500);
    }
  }, [grades]);

  const begin = () => {
    setGrades([]);
    setRound(0);
    peakSmile.current = 0;
    peakLaugh.current = 0;
    setPhase('running');
  };

  // each round is capped so the game keeps moving even on a long reel
  useEffect(() => {
    if (phase !== 'running') return;
    roundTimer.current = window.setTimeout(endRound, ROUND_MS);
    return () => window.clearTimeout(roundTimer.current);
  }, [phase, round, endRound]);

  const reel = ROUNDS[round % ROUNDS.length];

  return (
    <div className="game">
      <Panel
        title="Game B — Poker Face"
        icon="🗿"
        right={
          <Chip color="var(--violet)">
            Round {Math.min(round + 1, ROUNDS.length)} / {ROUNDS.length}
          </Chip>
        }
      >
        <div className="game__stage">
          <AnimatePresence mode="wait">
            {phase === 'ready' && (
              <motion.div key="ready" className="game__intro" exit={{ opacity: 0 }}>
                <div className="game__bigicon">🗿</div>
                <h3 className="game__title">Four rounds. Increasingly ridiculous.</h3>
                <p className="game__sub ml">മുഖഭാവം മാറ്റരുത്.</p>
                <p className="fine" style={{ maxWidth: 380, textAlign: 'center' }}>
                  Each round is graded on the strongest expression estimated during it. The grading
                  is arbitrary and the score means nothing.
                </p>
                <button className="btn btn--primary" onClick={begin}>
                  ▶ Start round 1
                </button>
              </motion.div>
            )}

            {phase === 'running' && (
              <motion.div
                key={`r${round}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ height: '100%' }}
              >
                <ReelPlayer reel={reel} playing muted onEnded={endRound} onError={endRound} />
              </motion.div>
            )}

            {phase === 'between' && (
              <motion.div
                key="between"
                className="game__intro"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="game__bigicon">{GRADE_STYLE[grades[grades.length - 1]].emoji}</div>
                <div
                  className="game__verdict"
                  style={{ color: GRADE_STYLE[grades[grades.length - 1]].color }}
                >
                  {grades[grades.length - 1]}
                </div>
                <p className="fine">Next round loading…</p>
              </motion.div>
            )}

            {phase === 'done' && (
              <motion.div
                key="done"
                className="game__result"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              >
                <div className="game__bigicon">{score > 60 ? '🗿' : '😂'}</div>
                <div className="game__score">
                  <div className="label">Poker face score</div>
                  <div className="game__scoreval mono">
                    {score}
                    <span className="game__scoremax">/100</span>
                  </div>
                </div>
                <p className="game__sub">
                  {score > 70
                    ? 'Unsettlingly composed.'
                    : score > 40
                      ? 'You wobbled. We saw it.'
                      : 'No poker face detected at all.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* round scoreboard */}
        <div className="pf__rounds">
          {ROUNDS.map((_, i) => {
            const g = grades[i];
            return (
              <div key={i} className={`pf__round ${g ? 'pf__round--done' : ''}`}>
                <span className="pf__roundno label">Round {i + 1}</span>
                {g ? (
                  <span className="pf__grade" style={{ color: GRADE_STYLE[g].color }}>
                    {GRADE_STYLE[g].emoji} {g}
                  </span>
                ) : (
                  <span className="pf__grade" style={{ color: 'var(--ink-4)' }}>
                    {i === round && phase === 'running' ? '● live' : '—'}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="row" style={{ marginTop: 14, gap: 10 }}>
          {phase === 'done' && (
            <button className="btn btn--primary btn--sm" onClick={begin}>
              ↻ Play again
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

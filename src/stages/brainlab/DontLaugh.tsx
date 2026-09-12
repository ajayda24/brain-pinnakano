import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { shuffledReels } from '../../config/reels';
import { ReelPlayer } from '../../components/ReelPlayer';
import { Panel, Chip, Bar } from '../../components/ui/primitives';
import { useFaceFrame } from '../../face/useFaceSignals';
import { metrics } from '../../state/metricsEngine';
import { session } from '../../state/session';

const FAIL_AT = 0.42;

type Phase = 'ready' | 'running' | 'failed' | 'survived';

export function DontLaugh({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('ready');
  const playlist = useMemo(() => shuffledReels(), []);
  const [reelIndex, setReelIndex] = useState(0);
  const [willpower, setWillpower] = useState(100);
  const [survivedMs, setSurvivedMs] = useState(0);

  const startedAt = useRef(0);
  const peakSmile = useRef(0);
  const phaseRef = useRef<Phase>('ready');
  phaseRef.current = phase;

  const meterRef = useRef<HTMLDivElement>(null);
  const reel = playlist[reelIndex % playlist.length];

  const settle = useCallback((result: Phase) => {
    if (phaseRef.current !== 'running') return;
    const elapsed = performance.now() - startedAt.current;
    setSurvivedMs(elapsed);

    // survival time carries most of the score; a big grin costs you the rest
    const timeScore = Math.min(70, (elapsed / 1000) * 5.2);
    const restraint = Math.max(0, 30 - peakSmile.current * 34);
    const score = Math.round(Math.max(1, Math.min(100, timeScore + restraint)));
    setWillpower(score);
    setPhase(result);

    session.games.dontLaugh = {
      survivedMs: elapsed,
      willpower: score,
      failed: result === 'failed',
    };
    metrics.bumpPinnakk(result === 'failed' ? 3.5 : -2);
    metrics.bumpMotivation(8);
  }, []);

  // live smile monitoring — the meter is written straight to the DOM
  useFaceFrame((f) => {
    if (phaseRef.current !== 'running') return;
    const s = f.signals.smile;
    if (s > peakSmile.current) peakSmile.current = s;
    if (meterRef.current) {
      meterRef.current.style.width = `${Math.min(100, (s / FAIL_AT) * 100).toFixed(1)}%`;
    }
    if (s > FAIL_AT) settle('failed');
  });

  useEffect(() => {
    metrics.setReelActivity(phase === 'running' ? 1 : 0);
    return () => metrics.setReelActivity(0);
  }, [phase]);

  const begin = () => {
    peakSmile.current = 0;
    startedAt.current = performance.now();
    setPhase('running');
  };

  const retry = () => {
    setReelIndex((i) => (i + 1) % playlist.length);
    setPhase('ready');
  };

  return (
    <div className="game">
      <Panel
        title="Game A — Don't Laugh"
        icon="😐"
        right={<Chip color="var(--red)">Willpower test</Chip>}
      >
        <div className="game__stage">
          {phase === 'ready' && (
            <div className="game__intro">
              <div className="game__bigicon">😐</div>
              <h3 className="game__title">Maintain a neutral face.</h3>
              <p className="game__sub ml">ചിരിക്കരുത്. അത്രമാത്രം.</p>
              <p className="fine" style={{ maxWidth: 380, textAlign: 'center' }}>
                We will show you something. The instant a smile is estimated above threshold, the
                mission ends. Your willpower score is invented.
              </p>
              <button className="btn btn--primary" onClick={begin}>
                ▶ Begin test
              </button>
            </div>
          )}

          {phase === 'running' && (
            <ReelPlayer
              reel={reel}
              playing
              muted
              onEnded={() => settle('survived')}
              onError={() => settle('survived')}
            />
          )}

          {(phase === 'failed' || phase === 'survived') && (
            <motion.div
              className="game__result"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            >
              <div className="game__bigicon">{phase === 'failed' ? '😂' : '🗿'}</div>
              <div
                className="game__verdict"
                style={{ color: phase === 'failed' ? 'var(--red)' : 'var(--green)' }}
              >
                {phase === 'failed' ? 'MISSION FAILED' : 'MISSION COMPLETE'}
              </div>
              <p className="game__sub">
                {phase === 'failed'
                  ? 'Smile detected.'
                  : 'No smile detected. Concerning, honestly.'}
              </p>

              <div className="game__score">
                <div className="label">Willpower</div>
                <div className="game__scoreval mono">
                  {willpower}
                  <span className="game__scoremax">/100</span>
                </div>
              </div>

              <p className="fine">Survived {(survivedMs / 1000).toFixed(1)} seconds.</p>
            </motion.div>
          )}
        </div>

        {phase === 'running' && (
          <div className="game__meter">
            <span className="label">Smile threshold</span>
            <div className="bar" style={{ ['--h' as string]: '9px', ['--c' as string]: 'var(--red)', flex: 1 }}>
              <div ref={meterRef} className="bar__fill" style={{ width: '0%' }} />
            </div>
            <span className="fine">fail at 100%</span>
          </div>
        )}

        <div className="row" style={{ marginTop: 14, gap: 10 }}>
          {(phase === 'failed' || phase === 'survived') && (
            <button className="btn btn--primary btn--sm" onClick={retry}>
              ↻ Try another
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

/** Small helper used by the hub card to show a previous result. */
export function DontLaughBadge() {
  const r = session.games.dontLaugh;
  if (!r) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <Bar value={r.willpower} color="var(--red)" height={5} />
      <span className="fine">Willpower {r.willpower}/100</span>
    </div>
  );
}

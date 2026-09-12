import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { USING_BUILTIN_REELS, shuffledReels } from '../config/reels';
import { ReelPlayer } from '../components/ReelPlayer';
import { Panel, Chip, Bar } from '../components/ui/primitives';
import { TerminalLines } from '../components/ui/Typewriter';
import { metrics } from '../state/metricsEngine';
import { session } from '../state/session';
import { timelineBuckets, useReactionRecorder, type ReactionSummary } from '../state/useReaction';
import { useApp } from '../state/store';

type Phase = 'protocol' | 'playing' | 'report';

const PROTOCOL = [
  { text: 'REEL ANALYSIS PROTOCOL', className: 'hi' },
  { text: '' },
  { text: 'Preparing subject...', pause: 320 },
  { text: 'Face detected ✓', className: 'ok' },
  { text: 'Eyes detected ✓', className: 'ok' },
  { text: 'Attention detected ✓', className: 'ok' },
  { text: 'Sense of humour detected ?', className: 'warn', pause: 520 },
  { text: '' },
  { text: 'Starting test...', className: 'hi' },
];

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

/** Several lines per band, so the report is not the same every reel. */
const VERDICTS = {
  strong: {
    tone: 'var(--green)',
    titles: [
      'This reel successfully activated your brain.',
      'Significant brain activity detected.',
      'തല പ്രവർത്തിക്കുന്നുണ്ട്. സ്ഥിരീകരിച്ചു.',
      'Laughter module responded on the first attempt.',
    ],
    subs: [
      'Humanity may survive.',
      'Filed under: evidence of a personality.',
      'ഇത്രയും ചിരിക്കാൻ മാത്രം ഉണ്ടായിരുന്നോ?',
      'We are legally required to call this a success.',
    ],
  },
  medium: {
    tone: 'var(--amber)',
    titles: [
      'Minor brain activity detected.',
      'Partial response recorded.',
      'ചെറിയ ഒരു അനക്കം ഉണ്ടായി.',
      'Something happened. Probably.',
    ],
    subs: [
      'Something moved in there. We are not sure what.',
      'Within the margin of error, which is total.',
      'മുഖം അല്പം മാറി. അത്രമാത്രം.',
      'Recorded, logged, and immediately doubted.',
    ],
  },
  faint: {
    tone: 'var(--violet)',
    titles: [
      'A smile was recorded. Barely.',
      'Trace amounts of amusement.',
      'ഒരു ചെറു ചിരി. അത്രയേ ഉള്ളൂ.',
    ],
    subs: [
      'Your humour module may require an update.',
      'That was closer to a wince.',
      'ഇത് ചിരിയാണോ എന്ന് ഉറപ്പില്ല.',
    ],
  },
  none: {
    tone: 'var(--red)',
    titles: [
      'No significant brain activity detected.',
      'Subject unmoved.',
      'ഒരു ഭാവവ്യത്യാസവും ഇല്ല.',
      'HUMOUR.EXE did not respond.',
    ],
    subs: [
      'This was supposed to be funny.',
      'The reel is fine. We checked.',
      'നിങ്ങളുടെ പ്രശ്നമാണ്, reel-ന്റെ അല്ല.',
      'Consider laughing next time, for appearances.',
    ],
  },
} as const;

function verdictFor(s: ReactionSummary) {
  const band =
    s.maxLaugh > 62
      ? VERDICTS.strong
      : s.maxLaugh > 32
        ? VERDICTS.medium
        : s.smileSeconds > 0.5
          ? VERDICTS.faint
          : VERDICTS.none;
  const sub = pick(band.subs);
  return {
    title: pick(band.titles),
    sub:
      band === VERDICTS.strong
        ? `You laughed for ${s.smileSeconds.toFixed(1)} seconds. ${sub}`
        : sub,
    tone: band.tone,
  };
}

/** Live reaction trace — the emoji strip plus an area chart. */
function ReactionTimeline({
  samples,
  live,
}: {
  samples: { t: number; smile: number; laugh: number; attention: number }[];
  live?: boolean;
}) {
  const buckets = timelineBuckets(samples, 5);
  const total = samples.length ? samples[samples.length - 1].t || 1 : 1;

  const path = useMemo(() => {
    if (samples.length < 2) return { laugh: '', smile: '' };
    const W = 100;
    const H = 34;
    const pts = (key: 'laugh' | 'smile') =>
      samples
        .map((s) => `${((s.t / total) * W).toFixed(2)},${(H - s[key] * H).toFixed(2)}`)
        .join(' ');
    return { laugh: pts('laugh'), smile: pts('smile') };
  }, [samples, total]);

  return (
    <div className="tl">
      <div className="tl__head">
        <span className="label">Reaction timeline</span>
        {live && <Chip color="var(--red)">● Recording</Chip>}
      </div>

      <svg className="tl__chart" viewBox="0 0 100 34" preserveAspectRatio="none">
        {path.laugh && (
          <>
            <polygon points={`0,34 ${path.laugh} 100,34`} fill="var(--c1)" opacity="0.14" />
            <polyline
              points={path.smile}
              fill="none"
              stroke="var(--c5)"
              strokeWidth="0.6"
              vectorEffect="non-scaling-stroke"
              opacity="0.8"
            />
            <polyline
              points={path.laugh}
              fill="none"
              stroke="var(--c1)"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>

      <div className="tl__strip">
        {buckets.length ? (
          buckets.map((b, i) => (
            <div key={i} className="tl__cell">
              <span className="tl__emoji">{b.emoji}</span>
              <span className="tl__dash" />
              <span className="tl__time mono">{b.at.toFixed(0)}s</span>
            </div>
          ))
        ) : (
          <span className="fine">waiting for data…</span>
        )}
      </div>
    </div>
  );
}

export function ReelLab() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('protocol');
  const [summary, setSummary] = useState<ReactionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState({ t: 0, d: 1 });

  // A fresh order each session, so a second run through the demo is not a
  // replay of the first.
  const playlist = useMemo(() => shuffledReels(), []);
  const reel = playlist[index % playlist.length];
  const { samples, start, stop, summarise } = useReactionRecorder();
  const setView = useApp((s) => s.setView);
  const finished = useRef(false);

  // Tell the metrics engine (and the simulator) that a reel is on screen.
  useEffect(() => {
    metrics.setReelActivity(phase === 'playing' ? 1 : 0);
    return () => metrics.setReelActivity(0);
  }, [phase]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    stop();
    const s = summarise();
    setSummary(s);
    setPhase('report');

    session.reels.push({
      reelId: reel.id,
      title: reel.title,
      maxLaugh: s.maxLaugh,
      attention: s.attention,
      smileSeconds: s.smileSeconds,
      pokerFace: s.pokerFace,
      pinnakkDelta: s.pinnakkDelta,
      samples: samples.slice(),
    });
    metrics.bumpPinnakk(s.pinnakkDelta);
    metrics.bumpMotivation(6);
  }, [stop, summarise, reel, samples]);

  const beginPlayback = useCallback(() => {
    finished.current = false;
    setError(null);
    setSummary(null);
    setPhase('playing');
    start();
  }, [start]);

  const nextReel = () => {
    stop();
    finished.current = false;
    setSummary(null);
    setError(null);
    setProgress({ t: 0, d: 1 });
    setIndex((i) => (i + 1) % playlist.length);
    setPhase('protocol');
  };

  const onError = useCallback(
    (message: string) => {
      stop();
      setError(message);
      setPhase('report');
    },
    [stop],
  );

  // computed once per summary: re-rolling on every render would make the
  // verdict flicker between lines while the user is reading it
  const verdict = useMemo(() => (summary ? verdictFor(summary) : null), [summary]);

  return (
    <div className="bento">
      {/* ---------------- stage ---------------- */}
      <motion.div
        className="col-7"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <Panel
          title="Reel Lab"
          subtitle="Reaction analysis protocol"
          right={
            <div className="row" style={{ gap: 7 }}>
              <Chip color="var(--ink-3)">
                {index + 1} / {playlist.length}
              </Chip>
              {reel.type !== 'synthetic' && (
                <button className="btn btn--ghost btn--sm" onClick={() => setMuted((m) => !m)}>
                  {muted ? '🔇 Unmute' : '🔊 Mute'}
                </button>
              )}
            </div>
          }
        >
          <div className="reel__stagewrap">
            <AnimatePresence mode="wait">
              {phase === 'protocol' && (
                <motion.div
                  key="protocol"
                  className="reel__protocol"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TerminalLines
                    lines={PROTOCOL}
                    className="term reel__term"
                    onDone={beginPlayback}
                  />
                </motion.div>
              )}

              {phase === 'playing' && (
                <motion.div
                  key={`play-${reel.id}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ height: '100%' }}
                >
                  <ReelPlayer
                    reel={reel}
                    playing
                    muted={muted}
                    onEnded={finish}
                    onError={onError}
                    onProgress={(t, d) => setProgress({ t, d })}
                  />
                </motion.div>
              )}

              {phase === 'report' && (
                <motion.div
                  key="report"
                  className="reel__reportstage"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  {error ? (
                    <div className="reel__err">
                      <div className="pd__errcode" style={{ fontSize: 20 }}>
                        REEL UNAVAILABLE
                      </div>
                      <p className="pd__errtext">{error}</p>
                      <p className="fine">Skipping to the next one.</p>
                    </div>
                  ) : (
                    verdict && (
                      <>
                        <div className="reel__verdicticon">
                          {summary && summary.maxLaugh > 50 ? '🧠' : '😐'}
                        </div>
                        <div className="reel__verdict" style={{ color: verdict.tone }}>
                          {verdict.title}
                        </div>
                        <p className="reel__verdictsub">{verdict.sub}</p>
                      </>
                    )
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {phase === 'playing' && (
            <div className="reel__progress">
              <Bar
                value={(progress.t / Math.max(0.1, progress.d)) * 100}
                color="var(--magenta)"
                height={4}
              />
              <span className="mono fine" style={{ minWidth: 70, textAlign: 'right' }}>
                {progress.t.toFixed(1)}s / {progress.d.toFixed(0)}s
              </span>
            </div>
          )}

          <div className="row" style={{ marginTop: 14, gap: 10 }}>
            {phase === 'report' ? (
              <>
                <button className="btn btn--primary" onClick={nextReel}>
                  ▶ Next reel
                </button>
                <button className="btn btn--ghost" onClick={() => setView('brainlab')}>
                  🎮 Brain Lab →
                </button>
              </>
            ) : (
              <button className="btn btn--ghost btn--sm" onClick={phase === 'playing' ? finish : nextReel}>
                {phase === 'playing' ? 'Stop test' : 'Skip'}
              </button>
            )}
            <span className="panel__spacer" />
            <span className="fine">{reel.title}</span>
          </div>
        </Panel>

        {USING_BUILTIN_REELS && (
          <p className="disclaimer" style={{ marginTop: 10 }}>
            <span>⚙️</span>
            <span>
              Running on built-in synthetic reels. To use your own YouTube Shorts, paste their IDs
              into <code>src/config/reels.ts</code> — it is the only file you need to touch.
            </span>
          </p>
        )}
      </motion.div>

      {/* ---------------- analysis ---------------- */}
      <motion.div
        className="col-5 stack"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
      >
        <Panel title="Live reaction" subtitle="Sampled at 4 Hz">
          <ReactionTimeline samples={samples} live={phase === 'playing'} />
        </Panel>

        <Panel
          title="Reel performance report"
          subtitle="Generated when a reel finishes"
        >
          {summary ? (
            <div className="stack" style={{ gap: 0 }}>
              <Metric label="Maximum laugh" value={`${summary.maxLaugh.toFixed(0)}%`} color="var(--amber)" />
              <Metric label="Attention" value={`${summary.attention.toFixed(0)}%`} color="var(--cyan)" />
              <Metric label="Smile duration" value={`${summary.smileSeconds.toFixed(1)} sec`} color="var(--green)" />
              <Metric label="Poker face" value={`${summary.pokerFace.toFixed(0)}%`} color="var(--violet)" />
              <Metric
                label="പിണ്ണാക്ക് change"
                value={`${summary.pinnakkDelta > 0 ? '+' : ''}${summary.pinnakkDelta.toFixed(0)}%`}
                color={summary.pinnakkDelta > 0 ? 'var(--red)' : 'var(--green)'}
              />
            </div>
          ) : (
            <p className="fine">
              The report appears once a reel finishes. Watch one all the way through — the
              measurements are meaningless either way, but they are more detailed.
            </p>
          )}
        </Panel>
      </motion.div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="statrow">
      <span className="statrow__label">{label}</span>
      <span className="statrow__dots" />
      <span className="statrow__value mono" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

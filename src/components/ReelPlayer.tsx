/**
 * Plays one reel from any of the three supported sources and reports progress.
 *
 * The synthetic source exists so the whole experience — Reel Lab, Don't Laugh,
 * Poker Face — still works with no internet and no configured videos. A dead
 * YouTube embed falls out in character rather than hanging the demo.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { Reel } from '../config/reels';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

/** Loads the YouTube IFrame API once, and gives up rather than hanging. */
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error('YouTube API did not load — check the network.')),
      8000,
    );
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout);
      prev?.();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('YouTube could not be reached.'));
    };
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

export interface ReelPlayerProps {
  reel: Reel;
  /** false pauses playback without unmounting */
  playing: boolean;
  onEnded: () => void;
  onError: (message: string) => void;
  onProgress?: (elapsed: number, duration: number) => void;
  /** starts muted so autoplay is allowed; Reel Lab offers an unmute button */
  muted?: boolean;
}

export function ReelPlayer(props: ReelPlayerProps) {
  if (props.reel.type === 'synthetic') return <SyntheticReel {...props} />;
  if (props.reel.type === 'local') return <LocalReel {...props} />;
  return <YouTubeReel {...props} />;
}

/* ------------------------------------------------------------- synthetic */

function SyntheticReel({ reel, playing, onEnded, onProgress }: ReelPlayerProps) {
  const lines = reel.type === 'synthetic' ? reel.lines : [];
  const duration = reel.type === 'synthetic' ? reel.seconds : 12;
  const accent = (reel.type === 'synthetic' && reel.accent) || '#0f6cbd';
  const [elapsed, setElapsed] = useState(0);
  const doneRef = useRef(false);
  const clockRef = useRef(0);

  useEffect(() => {
    doneRef.current = false;
    clockRef.current = 0;
    setElapsed(0);
  }, [reel.id]);

  const cb = useRef({ onEnded, onProgress });
  cb.current = { onEnded, onProgress };

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    // Tracked in a local, not via a setState updater: calling the parent's
    // onProgress from inside an updater runs it during React's render phase.
    let e = clockRef.current;

    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      e += dt;
      clockRef.current = e;
      setElapsed(e);
      cb.current.onProgress?.(Math.min(e, duration), duration);
      if (e >= duration && !doneRef.current) {
        doneRef.current = true;
        cb.current.onEnded();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, reel.id]);

  // reveal lines across the first 70% of the runtime, punchline last
  const progress = Math.min(1, elapsed / duration);
  const shown = Math.min(lines.length, Math.ceil((progress / 0.7) * lines.length));

  return (
    <div className="reelstage reelstage--synth" style={{ ['--accent' as string]: accent }}>
      <div className="synth">
        <span className="synth__bar" />
        {lines.slice(0, shown).map((l, i) => (
          <motion.div
            key={`${reel.id}-${i}`}
            className={`synth__line ${i === lines.length - 1 ? 'synth__line--punch' : ''} ml`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            {l || ' '}
          </motion.div>
        ))}
        <div className="synth__tag">{reel.title.toUpperCase()} · BUILT-IN</div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- local */

function LocalReel({ reel, playing, muted = true, onEnded, onError, onProgress }: ReelPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const src = reel.type === 'local' ? reel.src : '';

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) v.play().catch(() => undefined);
    else v.pause();
  }, [playing, reel.id]);

  return (
    <div className="reelstage">
      <video
        ref={ref}
        className="reelstage__video"
        src={src}
        playsInline
        autoPlay
        muted={muted}
        onEnded={onEnded}
        onError={() => onError(`Could not load ${src}. Is the file in public/reels/?`)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration) onProgress?.(v.currentTime, v.duration);
        }}
      />
    </div>
  );
}

/* --------------------------------------------------------------- youtube */

function YouTubeReel({ reel, playing, muted = true, onEnded, onError, onProgress }: ReelPlayerProps) {
  const holder = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const videoId = reel.type === 'youtube' ? reel.videoId : '';

  const cb = useRef({ onEnded, onError, onProgress });
  cb.current = { onEnded, onError, onProgress };

  useEffect(() => {
    let disposed = false;
    let poll = 0;

    loadYouTubeApi()
      .then(() => {
        if (disposed || !holder.current) return;
        player.current = new window.YT.Player(holder.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            fs: 0,
          },
          events: {
            onReady: (e: any) => {
              if (disposed) return;
              setReady(true);
              // muted autoplay is the only kind browsers allow without a gesture
              e.target.mute();
              e.target.playVideo();
            },
            onStateChange: (e: any) => {
              if (e.data === window.YT.PlayerState.ENDED) cb.current.onEnded();
            },
            onError: (e: any) => {
              const code = e?.data;
              cb.current.onError(
                code === 101 || code === 150
                  ? 'This video does not allow embedding. Skipping.'
                  : `YouTube refused this video (code ${code}).`,
              );
            },
          },
        });

        poll = window.setInterval(() => {
          const p = player.current;
          if (!p?.getCurrentTime) return;
          const d = p.getDuration?.() ?? 0;
          if (d) cb.current.onProgress?.(p.getCurrentTime(), d);
        }, 250);
      })
      .catch((err: Error) => {
        if (!disposed) cb.current.onError(err.message);
      });

    return () => {
      disposed = true;
      window.clearInterval(poll);
      try {
        player.current?.destroy?.();
      } catch {
        /* already gone */
      }
      player.current = null;
    };
  }, [videoId]);

  useEffect(() => {
    const p = player.current;
    if (!p || !ready) return;
    if (playing) p.playVideo?.();
    else p.pauseVideo?.();
  }, [playing, ready]);

  useEffect(() => {
    const p = player.current;
    if (!p || !ready) return;
    if (muted) p.mute?.();
    else p.unMute?.();
  }, [muted, ready]);

  return (
    <div className="reelstage">
      <div ref={holder} className="reelstage__yt" />
      {!ready && (
        <div className="reelstage__loading">
          <span className="label">Contacting YouTube…</span>
        </div>
      )}
      {muted && <div className="reelstage__mutehint fine">muted so autoplay is allowed</div>}
    </div>
  );
}

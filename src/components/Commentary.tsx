import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { faceEngine } from '../face/faceEngine';
import { moodFor, QUIPS, type QuipMood } from '../config/quips';
import { useApp } from '../state/store';

/**
 * "WHY ARE YOU LOOKING LIKE THAT?"
 *
 * Every 14-22s, reacts out loud to whatever the face is currently doing.
 * Holds off while a system notification is on screen so the two never collide,
 * and works through each mood's lines before repeating any.
 */
export function Commentary({ enabled = true }: { enabled?: boolean }) {
  const [quip, setQuip] = useState<string | null>(null);
  const notifCount = useApp((s) => s.notifications.length);
  const notifRef = useRef(notifCount);
  notifRef.current = notifCount;

  // remaining unused lines per mood, refilled when a pool empties
  const pools = useRef<Record<string, string[]>>({});

  // yield the top strip to system alerts the moment one appears
  useEffect(() => {
    if (notifCount > 0) setQuip(null);
  }, [notifCount]);

  useEffect(() => {
    // Clearing on disable matters: the cleanup below cancels the hide timer, so
    // a quip left on screen at navigation would otherwise stay there forever.
    if (!enabled) {
      setQuip(null);
      return;
    }
    let hideTimer = 0;

    const pick = (mood: QuipMood) => {
      const pool = pools.current[mood]?.length
        ? pools.current[mood]
        : (pools.current[mood] = [...QUIPS[mood]]);
      const i = Math.floor(Math.random() * pool.length);
      return pool.splice(i, 1)[0];
    };

    const schedule = () => window.setTimeout(run, 14000 + Math.random() * 8000);
    let nextTimer = schedule();

    function run() {
      // let system alerts have the stage to themselves
      if (notifRef.current > 0) {
        nextTimer = window.setTimeout(run, 3000);
        return;
      }
      const mood = moodFor(faceEngine.lastFrame.signals);
      setQuip(pick(mood));
      hideTimer = window.setTimeout(() => setQuip(null), 5200);
      nextTimer = schedule();
    }

    return () => {
      window.clearTimeout(nextTimer);
      window.clearTimeout(hideTimer);
    };
  }, [enabled]);

  return (
    <AnimatePresence>
      {quip && (
        <motion.div
          className="commentary"
          initial={{ opacity: 0, y: -14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        >
          <span className="commentary__eye">👁️</span>
          <span className="commentary__text">{quip}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../state/store';

const LIFETIME = 4200;

export function Notifications() {
  const notifications = useApp((s) => s.notifications);
  const dismiss = useApp((s) => s.dismiss);

  useEffect(() => {
    if (!notifications.length) return;
    const timers = notifications.map((n) =>
      window.setTimeout(() => dismiss(n.key), Math.max(600, LIFETIME - (Date.now() - n.at))),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [notifications, dismiss]);

  return (
    <div className="notifs" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {notifications.map((n) => (
          <motion.div
            key={n.key}
            layout
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="notif"
            style={{ ['--c' as string]: n.color, position: 'relative' }}
            onClick={() => dismiss(n.key)}
          >
            <span className="notif__icon">{n.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div className="notif__title">{n.title}</div>
              {n.body && <div className="notif__body">{n.body}</div>}
            </div>
            <motion.span
              className="notif__bar"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: LIFETIME / 1000, ease: 'linear' }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

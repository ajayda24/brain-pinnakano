import { useEffect, useState } from 'react';
import { useApp, type DesktopView } from '../state/store';
import { progressText, reportReady } from '../state/session';
import { WebcamPip } from './WebcamPip';

/**
 * The left navigation: a brand block and a labelled menu grouped into sections,
 * with the active item carried by a pale tint rather than a heavy fill.
 */

interface Item {
  view: DesktopView;
  icon: string;
  label: string;
}

const MENU: Item[] = [
  { view: 'dashboard', icon: '▦', label: 'Performance' },
  { view: 'reels', icon: '▶', label: 'Reel Lab' },
  { view: 'brainlab', icon: '◎', label: 'Brain Lab' },
];

export function Sidebar() {
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const setStage = useApp((s) => s.setStage);
  const setAboutOpen = useApp((s) => s.setAboutOpen);
  const notify = useApp((s) => s.notify);

  // the report unlocks from session state, which lives outside React
  const [ready, setReady] = useState(reportReady());
  const [hint, setHint] = useState(progressText());
  useEffect(() => {
    const t = window.setInterval(() => {
      setReady(reportReady());
      setHint(progressText());
    }, 1200);
    return () => window.clearInterval(t);
  }, []);

  return (
    <aside className="side">
      <div className="brand">
        <span className="brand__mark">🧠</span>
        <span className="brand__name">
          PINNAKK OS<sup>™</sup>
        </span>
      </div>

      <nav className="side__nav" aria-label="Sections">
        <p className="side__label">Menu</p>
        {MENU.map((it) => (
          <button
            key={it.view}
            className={`navitem ${view === it.view ? 'navitem--on' : ''}`}
            onClick={() => setView(it.view)}
            aria-current={view === it.view}
          >
            <span className="navitem__icon">{it.icon}</span>
            <span className="navitem__label">{it.label}</span>
          </button>
        ))}

        <p className="side__label">Diagnostics</p>
        <button
          className="navitem"
          disabled={!ready}
          onClick={() => setStage('final')}
          title={ready ? 'Generate the final brain report' : hint}
        >
          <span className="navitem__icon">◫</span>
          <span className="navitem__label">Final Report</span>
          {ready && <span className="navitem__badge" />}
        </button>
        {!ready && <p className="side__hint">{hint}</p>}

        <p className="side__label">General</p>
        <button className="navitem" onClick={() => setAboutOpen(true)}>
          <span className="navitem__icon">ⓘ</span>
          <span className="navitem__label">About</span>
        </button>
      </nav>

      <WebcamPip />

      {/* In-character promo. The button is the joke. */}
      <div className="promo">
        <p className="promo__title">
          Upgrade to <span className="ml">പിണ്ണാക്ക്</span> Pro
        </p>
        <p className="promo__text">
          Unlock advanced diagnostics, unlimited തല, and a second opinion you will ignore.
        </p>
        <button
          className="promo__btn"
          onClick={() =>
            notify({
              icon: '💳',
              title: 'ERROR 402 — PAYMENT REQUIRED',
              body: 'There is no Pro version. There never was.',
              tone: 'error',
            })
          }
        >
          Upgrade Now
        </button>
      </div>
    </aside>
  );
}

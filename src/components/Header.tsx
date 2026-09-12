import { useEffect, useState } from 'react';
import { useApp } from '../state/store';
import { metrics } from '../state/metricsEngine';
import { LiveBar, LiveNumber } from './ui/live';
import { Chip } from './ui/primitives';
import { useEngineStatus } from '../face/useFaceSignals';

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <span className="hdr__clock mono">
      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

/** The chaya situation evolves slowly, so this polls slowly. */
function ChayaChip() {
  const [level, setLevel] = useState(metrics.metrics.chaya);
  useEffect(() => {
    const t = window.setInterval(() => setLevel(metrics.metrics.chaya), 2000);
    return () => window.clearInterval(t);
  }, []);
  const critical = level === 'CRITICAL' || level === 'അടിയന്തിരം';
  return (
    <Chip color={critical ? 'var(--red)' : 'var(--cyan)'} dot title="CHAYA REQUIREMENT">
      ചായ {level}
    </Chip>
  );
}

export function Header() {
  const status = useEngineStatus();
  const userName = useApp((s) => s.userName);
  const setAboutOpen = useApp((s) => s.setAboutOpen);
  const notifCount = useApp((s) => s.notifications.length);

  const name = userName.trim() || 'subject';
  const initials = (userName.trim() || 'PK').slice(0, 2).toUpperCase();

  return (
    <header className="hdr">
      <div className="hdr__greet">
        <h1 className="hdr__title">Welcome back, {name}! 👋</h1>
        <p className="hdr__sub">
          Here's what your <span className="ml">തല</span> is doing today
        </p>
      </div>

      <div className="hdr__meter" title="Live പിണ്ണാക്ക് index — entirely fictional">
        <span className="hdr__metericon">🐄</span>
        <div className="hdr__meterbar">
          <LiveBar select={(s) => s.m.pinnakkLevel} color="var(--amber)" height={6} />
        </div>
        <LiveNumber
          select={(s) => s.m.pinnakkLevel}
          format={(n) => `${n.toFixed(0)}%`}
          className="hdr__meterval mono"
        />
      </div>

      <ChayaChip />

      {status.simulated && (
        <Chip
          color="var(--violet)"
          dot
          title={status.reason ?? 'Signals are being generated, not read from a face.'}
        >
          Simulation
        </Chip>
      )}

      <Clock />

      <button
        className="hdr__bell"
        onClick={() => setAboutOpen(true)}
        aria-label="About this app"
        title="About — what this actually is"
      >
        ⓘ
        {notifCount > 0 && <span className="hdr__bellcount">{notifCount}</span>}
      </button>

      <div className="hdr__user">
        <span className="hdr__avatar">{initials}</span>
        <span className="hdr__userinfo">
          <span className="hdr__username">{userName.trim() || 'Anonymous Subject'}</span>
          <span className="hdr__usermail">diagnostics@pinnakk.os</span>
        </span>
      </div>
    </header>
  );
}

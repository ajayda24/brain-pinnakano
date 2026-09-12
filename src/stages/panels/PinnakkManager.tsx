import { useRef } from 'react';
import { Panel, PanelMenu } from '../../components/ui/primitives';
import { LiveBar, LiveNumber } from '../../components/ui/live';
import { useMetricsFrame } from '../../state/useMetrics';
import { PINNAKK_CATEGORIES } from '../../config/pinnakk';

/** Analogue needle gauge — deliberately over-engineered for a fake number. */
function PinnakkNeedle() {
  const needle = useRef<SVGGElement>(null);
  const jitter = useRef(0);

  useMetricsFrame((s) => {
    if (!needle.current) return;
    // a little instrument tremble, so it reads as a physical dial
    jitter.current = jitter.current * 0.86 + (Math.random() - 0.5) * 2.4;
    const v = Math.max(0, Math.min(100, s.m.pinnakkLevel + jitter.current));
    const angle = -90 + (v / 100) * 180;
    needle.current.setAttribute('transform', `rotate(${angle.toFixed(2)} 100 92)`);
  });

  return (
    <div className="needle">
      <svg viewBox="0 0 200 104" className="needle__svg">
        {/* three solid bands rather than a gradient sweep — this is how a
            real instrument dial is printed, and it stays readable in print */}
        <path d="M 16 92 A 84 84 0 0 1 58.9 18.9" fill="none" stroke="var(--green)" strokeWidth="9" />
        <path d="M 58.9 18.9 A 84 84 0 0 1 141.1 18.9" fill="none" stroke="var(--amber)" strokeWidth="9" />
        <path d="M 141.1 18.9 A 84 84 0 0 1 184 92" fill="none" stroke="var(--red)" strokeWidth="9" />
        {/* tick marks */}
        {Array.from({ length: 21 }, (_, i) => {
          const a = (-90 + (i / 20) * 180) * (Math.PI / 180);
          const inner = i % 5 === 0 ? 66 : 72;
          return (
            <line
              key={i}
              x1={100 + Math.sin(a) * inner}
              y1={92 - Math.cos(a) * inner}
              x2={100 + Math.sin(a) * 77}
              y2={92 - Math.cos(a) * 77}
              stroke="rgba(16,24,48,.22)"
              strokeWidth={i % 5 === 0 ? 1.6 : 0.8}
            />
          );
        })}
        <g ref={needle} style={{ transition: 'transform 120ms linear' }}>
          <line x1="100" y1="92" x2="100" y2="24" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="100" cy="24" r="3" fill="var(--amber)" />
        </g>
        <circle cx="100" cy="92" r="7" fill="var(--panel-solid)" stroke="var(--border-hi)" />
        <circle cx="100" cy="92" r="2.6" fill="var(--ink-2)" />
      </svg>
      <div className="needle__scale">
        <span className="fine">0</span>
        <span className="fine">50</span>
        <span className="fine">100</span>
      </div>
    </div>
  );
}

export function PinnakkManager() {
  return (
    <Panel
      title="Pinnakk Manager"
      subtitle="Distribution by source"
      right={<PanelMenu />}
    >
      {/* ---- total ---- */}
      <div className="pk__totalrow">
        <span className="label">
          Total <span className="ml">പിണ്ണാക്ക്</span>
        </span>
        <LiveNumber
          select={(s) => s.m.pinnakkLevel}
          format={(n) => `${n.toFixed(0)}%`}
          className="pk__total mono"
        />
      </div>
      <LiveBar select={(s) => s.m.pinnakkLevel} color="var(--amber)" height={13} />

      <PinnakkNeedle />

      {/* ---- breakdown ---- */}
      <div className="label" style={{ marginTop: 6, marginBottom: 8 }}>
        Current load
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {PINNAKK_CATEGORIES.map((c) => (
          <div key={c.id} className="pk__cat">
            <span className="pk__catlabel ml">{c.label}</span>
            <LiveBar select={(s) => s.m.categories[c.id]} color={c.color} height={6} />
            <LiveNumber
              select={(s) => s.m.categories[c.id]}
              format={(n) => `${n.toFixed(0)}%`}
              className="pk__catval mono"
              style={{ color: c.color }}
            />
          </div>
        ))}
      </div>

      {/* ---- the weight ---- */}
      <div className="pk__weight">
        <div>
          <div className="label">
            Current <span className="ml">പിണ്ണാക്ക്</span>
          </div>
          <div className="pk__kg">
            <LiveNumber
              select={(s) => s.m.pinnakkKg}
              format={(n) => n.toFixed(1)}
              className="mono"
            />
            <span className="pk__kgunit">KG</span>
          </div>
        </div>
        <span style={{ fontSize: 34, opacity: 0.9 }}>🐄</span>
      </div>
      <p className="fine" style={{ marginTop: 8 }}>
        This figure is fictional and generated for entertainment. <span className="ml">പിണ്ണാക്ക്</span>{' '}
        has no weight, no
        units, and no scientific basis whatsoever.
      </p>
    </Panel>
  );
}

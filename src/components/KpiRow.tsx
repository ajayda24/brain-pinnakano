import { LiveNumber, LiveText } from './ui/live';
import type { MetricsSnapshot } from '../state/metricsEngine';

/**
 * The pastel headline tiles. Each is a flat tinted block carrying one big
 * number and a grey caption — no borders, no shadows, no gradients.
 */

interface Kpi {
  tint: string;
  value: (s: MetricsSnapshot) => number;
  format: (n: number) => string;
  unit?: string;
  label: string;
}

const KPIS: Kpi[] = [
  {
    tint: 'var(--blue-soft)',
    value: (s) => s.m.procCount,
    format: (n) => n.toFixed(0),
    label: 'Active Processes',
  },
  {
    tint: 'var(--violet-soft)',
    value: (s) => s.m.brainCpu,
    format: (n) => `${n.toFixed(0)}%`,
    label: 'Utilisation Rate',
  },
  {
    tint: 'var(--green-soft)',
    value: (s) => s.m.ramUsedGb,
    format: (n) => n.toFixed(1),
    unit: 'GB',
    label: 'Brain Memory Used',
  },
  {
    tint: 'var(--red-soft)',
    value: (s) => s.m.overthinking,
    format: (n) => `${n.toFixed(0)}%`,
    label: 'Overthinking',
  },
];

export function KpiRow() {
  return (
    <div className="kpis">
      {KPIS.map((k) => (
        <div key={k.label} className="kpi" style={{ background: k.tint }}>
          <div className="kpi__value">
            <LiveNumber select={k.value} format={k.format} className="mono" />
            {k.unit && <span className="kpi__unit">{k.unit}</span>}
          </div>
          <div className="kpi__label">{k.label}</div>
        </div>
      ))}

      {/* the പിണ്ണാക്ക് tile gets its own emphasis */}
      <div className="kpi kpi--feature" style={{ background: 'var(--amber-soft)' }}>
        <div className="kpi__value">
          <LiveNumber
            select={(s) => s.m.pinnakkLevel}
            format={(n) => `${n.toFixed(0)}%`}
            className="mono"
          />
          <span className="kpi__emoji">🐄</span>
        </div>
        <div className="kpi__label">
          <span className="ml">പിണ്ണാക്ക്</span> Level ·{' '}
          <LiveText select={(s) => `${s.m.pinnakkKg.toFixed(1)} KG`} className="" />
        </div>
      </div>
    </div>
  );
}

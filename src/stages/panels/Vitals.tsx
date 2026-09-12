import { useState } from 'react';
import { Panel, Chip, PanelMenu } from '../../components/ui/primitives';
import { LiveNumber, LiveText, PerfGraph } from '../../components/ui/live';
import type { SeriesKey } from '../../state/metricsEngine';
import type { MetricsSnapshot } from '../../state/metricsEngine';

/**
 * Modelled on the Windows Task Manager "Performance" tab: a left rail of
 * resources, each with its own mini trace, and a large 60-second plot plus a
 * statistics block for whichever one is selected.
 */

interface Resource {
  key: SeriesKey;
  short: string;
  name: string;
  sub: string;
  color: string;
  /** the big readout under the resource name in the rail */
  rail: (s: MetricsSnapshot) => string;
}

const RESOURCES: Resource[] = [
  {
    key: 'brainCpu',
    short: 'CPU',
    name: 'Brain CPU',
    sub: 'PINNAKK Virtual Cortex  @ 2.30 GHz',
    color: 'var(--c1)',
    rail: (s) => `${s.m.brainCpu.toFixed(0)}%  ${s.m.brainTemp.toFixed(1)}°C`,
  },
  {
    key: 'brainRam',
    short: 'Memory',
    name: 'Brain RAM',
    sub: '16.0 GB DDR4 (unupgradeable)',
    color: 'var(--c2)',
    rail: (s) => `${s.m.ramUsedGb.toFixed(1)}/16.0 GB (${s.m.brainRam.toFixed(0)}%)`,
  },
  {
    key: 'attention',
    short: 'Attention',
    name: 'Attention',
    sub: 'Focus bus · 1 lane',
    color: 'var(--c4)',
    rail: (s) => `${s.m.attention.toFixed(0)}%`,
  },
  {
    key: 'motivation',
    short: 'Motivation',
    name: 'Motivation',
    sub: 'Depleting reserve · no refill',
    color: 'var(--c3)',
    rail: (s) => `${s.m.motivation.toFixed(0)}%`,
  },
  {
    key: 'socialBattery',
    short: 'Social',
    name: 'Social Battery',
    sub: 'Discharging · not rechargeable today',
    color: 'var(--c5)',
    rail: (s) => `${s.m.socialBattery.toFixed(0)}%`,
  },
  {
    key: 'pinnakkLevel',
    short: 'പിണ്ണാക്ക്',
    name: 'പിണ്ണാക്ക് Level',
    sub: 'Primary accumulation · no eviction policy',
    color: 'var(--c6)',
    rail: (s) => `${s.m.pinnakkLevel.toFixed(0)}%`,
  },
];

function fmtUptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d}:${p(h)}:${p(m)}:${p(s)}`;
}

/** The stat grid under the big graph, per resource. */
function DetailStats({ res }: { res: Resource }) {
  const rows: { label: string; node: React.ReactNode }[] =
    res.key === 'brainCpu'
      ? [
          { label: 'Utilisation', node: <LiveNumber select={(s) => s.m.brainCpu} format={(n) => `${n.toFixed(0)}%`} /> },
          { label: 'Temperature', node: <LiveNumber select={(s) => s.m.brainTemp} format={(n) => `${n.toFixed(1)}°C`} colorOf={(n) => (n > 70 ? 'var(--red)' : 'var(--ink)')} /> },
          { label: 'Processes', node: <LiveNumber select={(s) => s.m.procCount} format={(n) => n.toFixed(0)} /> },
          { label: 'Threads', node: <LiveNumber select={(s) => s.m.threads} format={(n) => n.toLocaleString()} /> },
          { label: 'Handles', node: <LiveNumber select={(s) => s.m.handles} format={(n) => n.toLocaleString()} /> },
          { label: 'Up time', node: <LiveText select={(s) => fmtUptime(s.m.uptimeSec)} /> },
        ]
      : res.key === 'brainRam'
        ? [
            { label: 'In use', node: <LiveNumber select={(s) => s.m.ramUsedGb} format={(n) => `${n.toFixed(1)} GB`} /> },
            { label: 'Available', node: <LiveNumber select={(s) => s.m.ramTotalGb - s.m.ramUsedGb} format={(n) => `${n.toFixed(1)} GB`} /> },
            { label: 'Committed', node: <LiveNumber select={(s) => s.m.ramUsedGb + 2.1} format={(n) => `${n.toFixed(1)}/18.1 GB`} /> },
            { label: 'Cached (2017)', node: <LiveNumber select={(s) => s.m.ramUsedGb * 0.34} format={(n) => `${n.toFixed(1)} GB`} /> },
            { label: 'Slots used', node: <span className="mono">2 of 2</span> },
            { label: 'Form factor', node: <span className="mono">തല</span> },
          ]
        : [
            { label: 'Current', node: <LiveNumber select={(s) => s.m[res.key]} format={(n) => `${n.toFixed(0)}%`} /> },
            { label: 'Overthinking', node: <LiveNumber select={(s) => s.m.overthinking} format={(n) => `${n.toFixed(0)}%`} /> },
            { label: 'Common sense', node: <LiveNumber select={(s) => s.m.commonSense} format={(n) => `${n.toFixed(0)}%`} /> },
            { label: 'Productivity', node: <LiveNumber select={(s) => s.m.productivity} format={(n) => `${n.toFixed(0)}%`} /> },
            { label: 'ചായ requirement', node: <LiveText select={(s) => s.m.chaya} colorOf={(v) => (v === 'CRITICAL' || v === 'അടിയന്തിരം' ? 'var(--red)' : 'var(--ink)')} /> },
            { label: 'Up time', node: <LiveText select={(s) => fmtUptime(s.m.uptimeSec)} /> },
          ];

  return (
    <div className="perf__stats">
      {rows.map((r) => (
        <div key={r.label} className="perf__stat">
          <span className="perf__statlabel">{r.label}</span>
          <span className="perf__statval mono">{r.node}</span>
        </div>
      ))}
    </div>
  );
}

export function Vitals() {
  const [selected, setSelected] = useState<SeriesKey>('brainCpu');
  const res = RESOURCES.find((r) => r.key === selected) ?? RESOURCES[0];

  return (
    <Panel
      title="Performance"
      subtitle="Live resource utilisation — every figure invented"
      right={
        <div className="row" style={{ gap: 8 }}>
          <Chip color="var(--green)" dot>
            Live
          </Chip>
          <PanelMenu />
        </div>
      }
      bodyClass="perf__body"
    >
      <div className="perf">
        {/* ---- resource rail ---- */}
        <div className="perf__rail" role="tablist" aria-label="Resources">
          {RESOURCES.map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={r.key === selected}
              className={`perf__railitem ${r.key === selected ? 'perf__railitem--on' : ''}`}
              style={{ ['--c' as string]: r.color }}
              onClick={() => setSelected(r.key)}
            >
              <span className="perf__railgraph">
                <PerfGraph seriesKey={r.key} color={r.color} height={38} grid={false} />
              </span>
              <span className="perf__railtext">
                <span className="perf__railname">{r.short}</span>
                <span className="perf__railval mono">
                  <LiveText select={r.rail} className="" />
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* ---- detail ---- */}
        <div className="perf__detail">
          <div className="perf__detailhead">
            <div>
              <h3 className="perf__name">{res.name}</h3>
              <p className="perf__sub">{res.sub}</p>
            </div>
            <div className="perf__big mono" style={{ color: res.color }}>
              <LiveNumber select={(s) => s.m[res.key]} format={(n) => `${n.toFixed(0)}%`} />
            </div>
          </div>

          <div className="perf__axis">
            <span className="perf__axistop">% Utilisation</span>
            <span className="perf__axismax">100%</span>
          </div>
          <div className="perf__plot" style={{ ['--c' as string]: res.color }}>
            <PerfGraph seriesKey={res.key} color={res.color} height={168} />
          </div>
          <div className="perf__axisfoot">
            <span>60 seconds</span>
            <span>0</span>
          </div>

          <DetailStats res={res} />
        </div>
      </div>
    </Panel>
  );
}

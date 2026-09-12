import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Chip, PanelMenu } from '../../components/ui/primitives';
import { useMetricsFrame } from '../../state/useMetrics';
import { metrics } from '../../state/metricsEngine';
import { useApp, type LiveProcess } from '../../state/store';

type SortKey = 'name' | 'cpu' | 'ram' | 'status';

/**
 * Modelled on the Windows Task Manager "Processes" tab: the CPU and Memory
 * columns carry a heat tint whose strength tracks the value, the header shows
 * the column total, and rows are dense.
 */

/**
 * Heat tint on the numeric cells — the Task Manager tell, kept pastel: a pale
 * blue at the bottom of the range warming to a pale amber at the top, never
 * strong enough to fight the text sitting on it.
 */
function heat(v: number, max: number) {
  const t = Math.max(0, Math.min(1, v / max));
  const r = Math.round(234 + 19 * t);
  const g = Math.round(241 - 3 * t);
  const b = Math.round(253 - 22 * t);
  return `rgba(${r}, ${g}, ${b}, ${(0.45 + t * 0.55).toFixed(2)})`;
}

/** Status colour, matching the reference's pastel status pills. */
function statusTone(status: string, ended: boolean) {
  if (ended) return 'var(--ink-3)';
  const s = status.toLowerCase();
  if (s.includes('not responding')) return 'var(--red)';
  if (s.includes('critical')) return 'var(--red)';
  if (s.includes('permanently')) return 'var(--violet)';
  if (s.includes('barely')) return 'var(--amber)';
  return 'var(--green)';
}

function CpuCell({ id }: { id: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useMetricsFrame((s) => {
    const el = ref.current;
    if (!el) return;
    const v = s.cpu[id] ?? 0;
    const txt = v < 0.05 ? '0%' : `${v.toFixed(1)}%`;
    if (el.textContent !== txt) el.textContent = txt;
    // scale the tint against the busiest row, not against 100
    const bg = heat(v, 30);
    if (el.style.backgroundColor !== bg) el.style.backgroundColor = bg;
  });
  return <span ref={ref} className="mono tm__num" />;
}

function RamCell({ id }: { id: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useMetricsFrame((s) => {
    const el = ref.current;
    if (!el) return;
    const v = s.ram[id] ?? 0;
    const txt = `${v.toFixed(1)} GB`;
    if (el.textContent !== txt) el.textContent = txt;
    const bg = heat(v, 4);
    if (el.style.backgroundColor !== bg) el.style.backgroundColor = bg;
  });
  return <span ref={ref} className="mono tm__num tm__col-ram" />;
}

function ProcessRow({ p, onSelect }: { p: LiveProcess; onSelect: (id: string) => void }) {
  return (
    <button
      className={`tm__row ${p.ended ? 'tm__row--dead' : ''}`}
      onClick={() => onSelect(p.id)}
    >
      <span className="tm__name">
        <span className="tm__icon">{p.transient ? '◈' : p.id === 'pinnakk' ? '▣' : '▢'}</span>
        <span className="tm__nametext">{p.name}</span>
        {p.transient && <span className="tm__new">new</span>}
      </span>
      <CpuCell id={p.id} />
      <RamCell id={p.id} />
      <span className="tm__statuscell">
        <Chip color={statusTone(p.statusNow, p.ended)} dot>
          {p.statusNow}
        </Chip>
      </span>
    </button>
  );
}

/** Column totals in the header, exactly like the real thing. */
function ColumnTotal({ kind }: { kind: 'cpu' | 'ram' }) {
  const ref = useRef<HTMLSpanElement>(null);
  useMetricsFrame((s) => {
    const el = ref.current;
    if (!el) return;
    const txt =
      kind === 'cpu'
        ? `${s.m.brainCpu.toFixed(0)}%`
        : `${s.m.brainRam.toFixed(0)}%`;
    if (el.textContent !== txt) el.textContent = txt;
  });
  return <span ref={ref} className="tm__total mono" />;
}

export function TaskManager() {
  const processes = useApp((s) => s.processes);
  const selectProcess = useApp((s) => s.selectProcess);
  const [sortKey, setSortKey] = useState<SortKey>('cpu');
  const [tick, setTick] = useState(0);
  const [frozen, setFrozen] = useState(false);

  // Re-sort on a slow beat so the table feels alive — but never while the
  // pointer is over the list, or rows slide out from under the click.
  useEffect(() => {
    if (sortKey !== 'cpu' || frozen) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 2000);
    return () => window.clearInterval(t);
  }, [sortKey, frozen]);

  const sorted = useMemo(() => {
    const list = [...processes];
    if (sortKey === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortKey === 'ram') list.sort((a, b) => (metrics.ram[b.id] ?? 0) - (metrics.ram[a.id] ?? 0));
    else if (sortKey === 'status') list.sort((a, b) => a.statusNow.localeCompare(b.statusNow));
    else list.sort((a, b) => (metrics.cpu[b.id] ?? 0) - (metrics.cpu[a.id] ?? 0));
    return list;
    // `tick` is the resort beat; metrics.cpu is read imperatively on purpose
  }, [processes, sortKey, tick]);

  const header = (key: SortKey, label: string, total?: 'cpu' | 'ram') => (
    <button
      className={[
        'tm__th',
        key === 'name' ? 'tm__th--name' : '',
        key === 'ram' ? 'tm__col-ram' : '',
        sortKey === key ? 'tm__th--on' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => setSortKey(key)}
    >
      {total && <ColumnTotal kind={total} />}
      <span className="tm__thlabel">
        {label}
        {sortKey === key && <span className="tm__caret">▾</span>}
      </span>
    </button>
  );

  return (
    <Panel
      title="Thala Task Manager"
      subtitle="Everything your തല is running right now"
      right={<PanelMenu />}
      bodyClass="tm__body"
    >
      <div className="tm__head">
        {header('name', 'Name')}
        {header('cpu', 'CPU', 'cpu')}
        {header('ram', 'Memory', 'ram')}
        {header('status', 'Status')}
      </div>

      <div
        className="tm__list"
        onPointerEnter={() => setFrozen(true)}
        onPointerLeave={() => setFrozen(false)}
        onFocusCapture={() => setFrozen(true)}
        onBlurCapture={() => setFrozen(false)}
      >
        {sorted.map((p) => (
          <ProcessRow key={p.id} p={p} onSelect={selectProcess} />
        ))}
      </div>

      <div className="tm__statusbar">
        <span>{frozen ? 'Sort paused while you choose' : 'Sorted by CPU'}</span>
        <span className="panel__spacer" />
        <span>Select a process for diagnostics. Most cannot be ended.</span>
      </div>
    </Panel>
  );
}

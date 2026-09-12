import type { CSSProperties, ReactNode } from 'react';

/* ------------------------------------------------------------------ Panel */

/**
 * A card. Title and optional grey subtitle sit inside the card body — there is
 * no separate header strip — with actions floated to the right, matching the
 * reference design language.
 */
export function Panel({
  title,
  subtitle,
  icon,
  right,
  children,
  className = '',
  bodyClass = '',
  style,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: string;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClass?: string;
  style?: CSSProperties;
}) {
  return (
    <section className={`panel ${className}`} style={style}>
      {title !== undefined && (
        <header className="panel__head">
          <div className="panel__titlewrap">
            <h2 className="panel__title">
              {icon && <span className="em">{icon}</span>}
              {title}
            </h2>
            {subtitle && <p className="panel__sub">{subtitle}</p>}
          </div>
          <span className="panel__spacer" />
          {right}
        </header>
      )}
      <div className={`panel__body ${bodyClass}`}>{children}</div>
    </section>
  );
}

/** The round "..." affordance from the reference. Decorative by default. */
export function PanelMenu({ onClick, label = 'Panel options' }: { onClick?: () => void; label?: string }) {
  return (
    <button className="iconbtn" onClick={onClick} aria-label={label} title={label}>
      ⋯
    </button>
  );
}

/* ------------------------------------------------------------------- Chip */

export function Chip({
  children,
  color = 'var(--blue)',
  soft,
  title,
  dot,
}: {
  children: ReactNode;
  color?: string;
  soft?: string;
  title?: string;
  /** leading status dot, as on the reference's Status column */
  dot?: boolean;
}) {
  return (
    <span
      className="chip"
      title={title}
      style={{
        ['--c' as string]: color,
        ['--c-soft' as string]: soft ?? `color-mix(in srgb, ${color} 11%, #fff)`,
      }}
    >
      {dot && <span className="chip__dot" />}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------- Bar */

export function Bar({
  value,
  color = 'var(--blue)',
  height = 7,
  ghost,
}: {
  value: number;
  color?: string;
  height?: number;
  ghost?: number;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="bar" style={{ ['--h' as string]: `${height}px`, ['--c' as string]: color }}>
      <div className="bar__ghost" style={{ width: `${ghost ?? v}%` }} />
      <div className="bar__fill" style={{ width: `${v}%` }} />
    </div>
  );
}

/** Terminal-style ██████░░░░ bar, for boot and report moments. */
export function BlockBar({
  value,
  width = 16,
  color = 'var(--blue)',
}: {
  value: number;
  width?: number;
  color?: string;
}) {
  const filled = Math.round((Math.max(0, Math.min(100, value)) / 100) * width);
  return (
    <span className="blockbar" style={{ ['--c' as string]: color }}>
      {'█'.repeat(filled)}
      <span className="off">{'░'.repeat(Math.max(0, width - filled))}</span>
    </span>
  );
}

/* ------------------------------------------------------------- stat lines */

export function StatRow({
  label,
  value,
  color = 'var(--ink)',
  mono = true,
}: {
  label: ReactNode;
  value: ReactNode;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div className="statrow">
      <span className="statrow__label">{label}</span>
      <span className="statrow__dots" />
      <span className={`statrow__value ${mono ? 'mono' : ''}`} style={{ color }}>
        {value}
      </span>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';

/**
 * Malayalam is written with conjuncts and combining marks, so slicing a string
 * by code unit tears glyphs in half mid-animation. Segment by *grapheme* and
 * the typewriter reveals whole characters the way a reader expects.
 */
const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

export function graphemes(text: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(text), (s) => s.segment);
  return Array.from(text); // code-point fallback; still better than .split('')
}

const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Typewriter({
  text,
  speed = 18,
  startDelay = 0,
  onDone,
  className,
  caret = false,
}: {
  text: string;
  /** ms per grapheme */
  speed?: number;
  startDelay?: number;
  onDone?: () => void;
  className?: string;
  caret?: boolean;
}) {
  const [shown, setShown] = useState(0);
  const chars = useRef<string[]>([]);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    chars.current = graphemes(text);
    setShown(0);

    if (prefersReducedMotion()) {
      setShown(chars.current.length);
      const t = window.setTimeout(() => done.current?.(), 10);
      return () => window.clearTimeout(t);
    }

    let i = 0;
    let timer = 0;
    const step = () => {
      i += 1;
      setShown(i);
      if (i >= chars.current.length) {
        done.current?.();
        return;
      }
      timer = window.setTimeout(step, speed);
    };
    timer = window.setTimeout(step, startDelay);
    return () => window.clearTimeout(timer);
  }, [text, speed, startDelay]);

  const complete = shown >= chars.current.length;
  return (
    <span className={className}>
      {chars.current.slice(0, shown).join('')}
      {caret && !complete && <span className="caret" />}
    </span>
  );
}

export interface TermLine {
  text: string;
  className?: string;
  /** pause after this line, ms */
  pause?: number;
  speed?: number;
}

/** Types a list of lines in sequence, then calls onDone. */
export function TerminalLines({
  lines,
  onDone,
  className = 'term',
  style,
  autoScroll = true,
}: {
  lines: TermLine[];
  onDone?: () => void;
  className?: string;
  style?: React.CSSProperties;
  autoScroll?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (autoScroll && boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [index, autoScroll]);

  useEffect(() => {
    if (index >= lines.length) done.current?.();
  }, [index, lines.length]);

  return (
    <div ref={boxRef} className={className} style={style}>
      {lines.slice(0, index).map((l, i) => (
        <div key={i} className={l.className}>
          {l.text || ' '}
        </div>
      ))}
      {index < lines.length && (
        <div className={lines[index].className}>
          <Typewriter
            text={lines[index].text}
            speed={lines[index].speed ?? 16}
            caret
            onDone={() => {
              const pause = lines[index].pause ?? 160;
              window.setTimeout(() => setIndex((n) => n + 1), pause);
            }}
          />
        </div>
      )}
    </div>
  );
}

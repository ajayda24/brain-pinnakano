/**
 * The pseudo-science. Every number produced from this file is invented for
 * comedy — none of it measures intelligence, mental health, or anything else.
 */

export interface PinnakkCategory {
  id: string;
  label: string;
  /** which live signal pushes this category up */
  driver: 'think' | 'memory' | 'reel' | 'idle' | 'love' | 'random';
  base: number;
  color: string;
}

export const PINNAKK_CATEGORIES: PinnakkCategory[] = [
  { id: 'think', label: 'വെറുതെ ചിന്തിക്കൽ', driver: 'think', base: 19, color: 'var(--violet)' },
  { id: 'memory', label: 'പഴയ സംഭവം ഓർക്കൽ', driver: 'memory', base: 21, color: 'var(--magenta)' },
  { id: 'reel', label: 'റീൽ പിണ്ണാക്ക്', driver: 'reel', base: 31, color: 'var(--amber)' },
  { id: 'sit', label: 'ചുമ്മാ ഇരിക്കൽ', driver: 'idle', base: 12, color: 'var(--cyan)' },
  { id: 'love', label: 'പ്രണയ പിണ്ണാക്ക്', driver: 'love', base: 8, color: 'var(--red)' },
  { id: 'random', label: 'Random nonsense', driver: 'random', base: 9, color: 'var(--blue)' },
];

export interface Classification {
  min: number;
  max: number;
  emoji: string;
  title: string;
  /** shown under the title on the final report */
  verdict: string;
  color: string;
}

export const CLASSIFICATIONS: Classification[] = [
  {
    min: 0,
    max: 20,
    emoji: '🧠',
    title: 'തല ക്ലീൻ',
    verdict: 'Suspiciously clean. Our engineers are re-running the test.',
    color: 'var(--green)',
  },
  {
    min: 20,
    max: 40,
    emoji: '🙂',
    title: 'ചെറിയ പിണ്ണാക്ക്',
    verdict: 'Within acceptable limits. Keep an eye on it anyway.',
    color: 'var(--cyan)',
  },
  {
    min: 40,
    max: 60,
    emoji: '🤨',
    title: 'ശ്രദ്ധിക്കേണ്ട പിണ്ണാക്ക്',
    verdict: 'Moderate accumulation detected. ചായ കുടിക്കൂ.',
    color: 'var(--blue)',
  },
  {
    min: 60,
    max: 80,
    emoji: '💀',
    title: 'ഗുരുതര പിണ്ണാക്ക്',
    verdict: 'Serious levels. Do not operate heavy machinery or group chats.',
    color: 'var(--violet)',
  },
  {
    min: 80,
    max: 95,
    emoji: '🐄',
    title: 'PREMIUM PINNAKK',
    verdict: 'Certified premium grade. Congratulations, we think.',
    color: 'var(--amber)',
  },
  {
    min: 95,
    max: 101,
    emoji: '🐄🔥',
    title: 'പിണ്ണാക്ക് തന്നെ തല',
    verdict: 'The തല is no longer distinguishable from the പിണ്ണാക്ക്.',
    color: 'var(--red)',
  },
];

export function classify(score: number): Classification {
  const s = Math.max(0, Math.min(100, score));
  return CLASSIFICATIONS.find((c) => s >= c.min && s < c.max) ?? CLASSIFICATIONS[4];
}

/** The CHAYA REQUIREMENT readout, because 4:30 PM is a medical event. */
export const CHAYA_LEVELS = ['NOMINAL', 'ELEVATED', 'HIGH', 'CRITICAL', 'അടിയന്തിരം'] as const;
export type ChayaLevel = (typeof CHAYA_LEVELS)[number];

export function chayaLevel(hour: number, socialBattery: number): ChayaLevel {
  // 4:30 PM is, scientifically, the worst of it.
  const peak = hour >= 15 && hour < 19 ? 2 : hour >= 6 && hour < 10 ? 1 : 0;
  const drained = socialBattery < 25 ? 2 : socialBattery < 50 ? 1 : 0;
  return CHAYA_LEVELS[Math.min(4, peak + drained)];
}

/**
 * Blendshape -> "signal" mapping.
 *
 * MediaPipe's FaceLandmarker emits 52 ARKit-style blendshape scores. We fold
 * those into a handful of smoothed 0..1 signals that the rest of the app reasons
 * about. These are rough expression *estimates*, not measurements of what anyone
 * is actually feeling — the whole app treats them as if they were precision
 * instruments, which is the joke.
 */

export interface FaceSignals {
  /** a face is currently visible */
  present: boolean;
  smile: number;
  laugh: number;
  confusion: number;
  surprise: number;
  neutral: number;
  jawOpen: number;
  browRaise: number;
  eyeWide: number;
  blink: number;
  /** looking away from the camera, from gaze blendshapes or head yaw */
  gazeAway: number;
  /** head pose, degrees */
  yaw: number;
  pitch: number;
  roll: number;
  /** how much the head is moving right now, 0..1 */
  motion: number;
  stillness: number;
  t: number;
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceFrame {
  signals: FaceSignals;
  landmarks: Landmark[] | null;
  source: 'camera' | 'simulation';
}

export const EMPTY_SIGNALS: FaceSignals = {
  present: false,
  smile: 0,
  laugh: 0,
  confusion: 0,
  surprise: 0,
  neutral: 1,
  jawOpen: 0,
  browRaise: 0,
  eyeWide: 0,
  blink: 0,
  gazeAway: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
  motion: 0,
  stillness: 1,
  t: 0,
};

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
export const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);

type ShapeMap = Record<string, number>;

/** Exponential moving average over the whole signal set. */
export class SignalSmoother {
  private prev: FaceSignals = { ...EMPTY_SIGNALS };

  constructor(private alpha = 0.25) {}

  smooth(next: FaceSignals): FaceSignals {
    const a = this.alpha;
    const p = this.prev;
    const mix = (k: keyof FaceSignals) => (p[k] as number) * (1 - a) + (next[k] as number) * a;
    const out: FaceSignals = {
      ...next,
      smile: mix('smile'),
      laugh: mix('laugh'),
      confusion: mix('confusion'),
      surprise: mix('surprise'),
      neutral: mix('neutral'),
      jawOpen: mix('jawOpen'),
      browRaise: mix('browRaise'),
      eyeWide: mix('eyeWide'),
      blink: mix('blink'),
      gazeAway: mix('gazeAway'),
      // pose is already stable; smooth it lightly so the overlay does not jitter
      yaw: p.yaw * 0.6 + next.yaw * 0.4,
      pitch: p.pitch * 0.6 + next.pitch * 0.4,
      roll: p.roll * 0.6 + next.roll * 0.4,
      motion: p.motion * 0.82 + next.motion * 0.18,
      stillness: 0,
    };
    out.stillness = clamp01(1 - out.motion);
    this.prev = out;
    return out;
  }

  reset() {
    this.prev = { ...EMPTY_SIGNALS };
  }
}

/**
 * Decompose MediaPipe's 4x4 facial transformation matrix (column-major) into
 * yaw / pitch / roll in degrees, using a Y-X-Z euler order.
 */
export function poseFromMatrix(data: number[] | Float32Array): {
  yaw: number;
  pitch: number;
  roll: number;
} {
  // column-major: R[row][col] === data[col * 4 + row]
  const r = (row: number, col: number) => data[col * 4 + row];
  const DEG = 180 / Math.PI;
  const pitch = Math.asin(clamp(-r(1, 2), -1, 1)) * DEG;
  const yaw = Math.atan2(r(0, 2), r(2, 2)) * DEG;
  const roll = Math.atan2(r(1, 0), r(1, 1)) * DEG;
  return { yaw, pitch, roll };
}

/** Build a name -> score lookup from a MediaPipe blendshape category list. */
export function toShapeMap(
  categories: Array<{ categoryName?: string; displayName?: string; score: number }>,
): ShapeMap {
  const m: ShapeMap = {};
  for (const c of categories) {
    const name = c.categoryName || c.displayName;
    if (name) m[name] = c.score;
  }
  return m;
}

const g = (m: ShapeMap, k: string) => m[k] ?? 0;
/** mean of the left/right pair of a blendshape */
const lr = (m: ShapeMap, base: string) => (g(m, `${base}Left`) + g(m, `${base}Right`)) / 2;

/**
 * Fold blendshapes + head pose into our signal set.
 * Motion energy is computed by the caller (it needs frame-to-frame deltas).
 */
export function deriveSignals(
  shapes: ShapeMap,
  pose: { yaw: number; pitch: number; roll: number },
  motion: number,
  t: number,
): FaceSignals {
  const smile = clamp01(lr(shapes, 'mouthSmile') * 1.15);
  const jawOpen = clamp01(g(shapes, 'jawOpen'));
  const cheek = lr(shapes, 'cheekSquint');
  const browInner = g(shapes, 'browInnerUp');
  const browOuter = lr(shapes, 'browOuterUp');
  const browDownAsym = Math.abs(g(shapes, 'browDownLeft') - g(shapes, 'browDownRight'));
  const pucker = g(shapes, 'mouthPucker');
  const eyeWide = lr(shapes, 'eyeWide');
  const blink = lr(shapes, 'eyeBlink');

  // A laugh is an open mouth that is *also* smiling. The gate stops yawns,
  // talking and chewing from registering as hilarity.
  const laughRaw = smile > 0.35 ? smile * 0.6 + jawOpen * 0.7 + cheek * 0.25 : jawOpen * 0.12;
  const laugh = clamp01(laughRaw);

  const confusion = clamp01(browInner * 0.5 + browDownAsym * 0.9 + pucker * 0.3);
  const surprise = clamp01(browOuter * 0.6 + jawOpen * 0.4 + eyeWide * 0.5);

  // Gaze: blendshape look-away, or the head simply turned.
  const gazeShape = Math.max(
    g(shapes, 'eyeLookOutLeft'),
    g(shapes, 'eyeLookOutRight'),
    g(shapes, 'eyeLookUpLeft'),
    g(shapes, 'eyeLookDownLeft') * 0.8,
  );
  const yawAway = clamp01((Math.abs(pose.yaw) - 18) / 24);
  const pitchAway = clamp01((Math.abs(pose.pitch) - 20) / 26);
  const gazeAway = clamp01(Math.max(gazeShape * 0.85, yawAway, pitchAway));

  const neutral = clamp01(1 - Math.max(smile, laugh, confusion, surprise));

  return {
    present: true,
    smile,
    laugh,
    confusion,
    surprise,
    neutral,
    jawOpen,
    browRaise: clamp01(Math.max(browInner, browOuter)),
    eyeWide,
    blink,
    gazeAway,
    yaw: pose.yaw,
    pitch: pose.pitch,
    roll: pose.roll,
    motion: clamp01(motion),
    stillness: clamp01(1 - motion),
    t,
  };
}

/**
 * The percentages shown in the FACIAL ANALYSIS readout. Deliberately does NOT
 * sum to 100 — they are independent estimates, and the app is not a real
 * emotion classifier.
 */
export function analysisRows(s: FaceSignals) {
  return [
    { emoji: '😐', label: 'Neutral', value: Math.round(s.neutral * 100), color: 'var(--ink-3)' },
    { emoji: '🙂', label: 'Happiness', value: Math.round(s.smile * 100), color: 'var(--green)' },
    { emoji: '😂', label: 'Laugh', value: Math.round(s.laugh * 100), color: 'var(--amber)' },
    { emoji: '🤨', label: 'Confusion', value: Math.round(s.confusion * 100), color: 'var(--violet)' },
    { emoji: '😮', label: 'Surprise', value: Math.round(s.surprise * 100), color: 'var(--cyan)' },
  ];
}

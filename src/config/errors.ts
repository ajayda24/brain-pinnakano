/** HUMAN.EXE alert system — fake OS notifications keyed to face events. */

import type { FaceEventType } from '../face/events';

export type AlertTone = 'info' | 'ok' | 'warn' | 'error' | 'pinnakk';

export interface AlertDef {
  title: string;
  body?: string;
  tone: AlertTone;
  icon: string;
}

/** Several variants per event so a long session does not repeat itself. */
export const EVENT_ALERTS: Record<FaceEventType, AlertDef[]> = {
  SMILE: [
    { icon: '⚠️', title: 'HAPPINESS DETECTED', tone: 'warn' },
    { icon: '🙂', title: 'HAPPINESS.EXE STARTED', body: 'Allocating unnecessary resources.', tone: 'ok' },
    { icon: '📈', title: 'MOOD SPIKE', body: 'Unscheduled. Logging it anyway.', tone: 'info' },
  ],
  LAUGH: [
    { icon: '😂', title: 'LAUGHING.EXE HAS STARTED', tone: 'ok' },
    { icon: '😂', title: 'LAUGHING.EXE CONSUMING CPU', body: 'Other processes are waiting.', tone: 'warn' },
    { icon: '🔥', title: 'CPU OVERHEATING', body: 'Please reduce happiness.', tone: 'error' },
  ],
  LOOK_AWAY: [
    { icon: '👀', title: 'FOCUS.EXE HAS CRASHED', tone: 'error' },
    { icon: '👀', title: 'FOCUS.EXE HAS LEFT THE CHAT', tone: 'warn' },
    { icon: '🚨', title: 'UNAUTHORIZED DEVICE ACCESS', body: 'Is that a phone?', tone: 'error' },
  ],
  IDLE: [
    { icon: '⚠️', title: 'HUMAN.EXE IS NOT RESPONDING', body: 'Wait for it? / End task?', tone: 'error' },
    { icon: '💤', title: 'HUMAN.EXE APPEARS UNIMPRESSED', tone: 'warn' },
    { icon: '🫥', title: 'Human.exe suspiciously idle', tone: 'warn' },
  ],
  CONFUSED: [
    { icon: '🤨', title: 'THINKING DETECTED', body: 'This may be dangerous.', tone: 'warn' },
    { icon: '🌀', title: 'OVERTHINKING.EXE PROMOTED', body: 'Now running as administrator.', tone: 'error' },
    { icon: '🤨', title: 'CONFUSION MODULE ACTIVE', tone: 'info' },
  ],
  SHAKY: [
    { icon: '📡', title: 'THOUGHT PROCESS UNSTABLE', tone: 'error' },
    { icon: '🌊', title: 'HEAD MOVEMENT EXCEEDS SPEC', body: 'Recalibrating പിണ്ണാക്ക് sensor.', tone: 'warn' },
  ],
  SURPRISE: [
    { icon: '😮', title: 'SURPRISE INTERRUPT', body: 'Nothing was supposed to happen.', tone: 'info' },
  ],
  FACE_LOST: [
    { icon: '❓', title: 'SUBJECT NOT FOUND', body: 'എവിടെ പോയി?', tone: 'error' },
    { icon: '📴', title: 'FACE SIGNAL LOST', body: 'Scanning for തല...', tone: 'warn' },
  ],
  FACE_FOUND: [
    { icon: '✅', title: 'SUBJECT REACQUIRED', body: 'തല located. Resuming diagnostics.', tone: 'ok' },
  ],
};

/** Fired on a slow timer regardless of the face — ambient system nonsense. */
export const AMBIENT_ALERTS: AlertDef[] = [
  { icon: '🐄', title: 'PINNAKK INDEX RECALCULATED', body: 'It went up. It always goes up.', tone: 'pinnakk' },
  { icon: '💾', title: 'BRAIN RAM AT CAPACITY', body: 'Consider forgetting something.', tone: 'warn' },
  { icon: '☕', title: 'CHAYA REQUIREMENT RISING', body: 'Recommended action: ചായ.', tone: 'info' },
  { icon: '🧊', title: 'BRAIN TEMPERATURE ABOVE SPEC', body: 'Cooling not available on this model.', tone: 'error' },
  { icon: '🔍', title: 'COMMON SENSE MODULE NOT FOUND', body: 'Searching alternate locations...', tone: 'error' },
  { icon: '📉', title: 'MOTIVATION.DLL MISSING', body: 'Reinstall failed. Again.', tone: 'error' },
  { icon: '🕰️', title: 'A MEMORY FROM 2017 QUEUED', body: 'It will play later, unprompted.', tone: 'pinnakk' },
  { icon: '🧮', title: 'PRODUCTIVITY RECOUNTED', body: 'Result unchanged: 3%.', tone: 'info' },
];

export const TONE_COLOR: Record<AlertTone, string> = {
  info: 'var(--blue)',
  ok: 'var(--green)',
  warn: 'var(--amber)',
  error: 'var(--red)',
  pinnakk: 'var(--magenta)',
};

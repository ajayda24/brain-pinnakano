/**
 * The session log — everything the FINAL BRAIN REPORT is built from.
 *
 * Plain module state rather than a store: it is written ~10x a second and read
 * only when a report is generated, so it has no business triggering renders.
 */

import type { FaceEventType } from '../face/events';

export interface ReelResult {
  reelId: string;
  title: string;
  maxLaugh: number;
  attention: number;
  smileSeconds: number;
  pokerFace: number;
  pinnakkDelta: number;
  samples: { t: number; smile: number; laugh: number; attention: number }[];
}

export interface GameResults {
  dontLaugh?: { survivedMs: number; willpower: number; failed: boolean };
  pokerFace?: { rounds: ('PASS' | 'WARNING' | 'FAILED')[]; score: number };
  captcha?: { answered: number; passed: boolean };
  stareContest?: { seconds: number };
}

export interface SessionLog {
  startedAt: number;
  laughMs: number;
  smileMs: number;
  idleMs: number;
  awayMs: number;
  presentMs: number;
  attentionSum: number;
  attentionCount: number;
  peakLaugh: number;
  eventCounts: Partial<Record<FaceEventType, number>>;
  reels: ReelResult[];
  games: GameResults;
  killedActualWork: boolean;
  endTaskAttempts: number;
}

function blank(): SessionLog {
  return {
    startedAt: Date.now(),
    laughMs: 0,
    smileMs: 0,
    idleMs: 0,
    awayMs: 0,
    presentMs: 0,
    attentionSum: 0,
    attentionCount: 0,
    peakLaugh: 0,
    eventCounts: {},
    reels: [],
    games: {},
    killedActualWork: false,
    endTaskAttempts: 0,
  };
}

export const session: SessionLog = blank();

export function resetSession() {
  Object.assign(session, blank());
}

/** Accumulate time-in-state. Called from the metrics tick. */
export function accumulate(
  dtMs: number,
  s: { present: boolean; laugh: number; smile: number; stillness: number; gazeAway: number },
  attention: number,
) {
  if (!s.present) return;
  session.presentMs += dtMs;
  if (s.laugh > 0.5) session.laughMs += dtMs;
  if (s.smile > 0.35) session.smileMs += dtMs;
  if (s.stillness > 0.94) session.idleMs += dtMs;
  if (s.gazeAway > 0.5) session.awayMs += dtMs;
  if (s.laugh > session.peakLaugh) session.peakLaugh = s.laugh;
  session.attentionSum += attention;
  session.attentionCount += 1;
}

export function countEvent(type: FaceEventType) {
  session.eventCounts[type] = (session.eventCounts[type] ?? 0) + 1;
}

export const avgAttention = () =>
  session.attentionCount ? session.attentionSum / session.attentionCount : 50;

/** Has the user done enough for a final report to be worth generating? */
export function reportReady() {
  const gamesPlayed = Object.keys(session.games).length;
  return session.reels.length >= 1 && gamesPlayed >= 1;
}

export function progressText() {
  const gamesPlayed = Object.keys(session.games).length;
  const need: string[] = [];
  if (session.reels.length < 1) need.push('1 reel');
  if (gamesPlayed < 1) need.push('1 brain game');
  return need.length ? `Needs ${need.join(' + ')}` : 'Ready';
}

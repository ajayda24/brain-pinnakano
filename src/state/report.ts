/**
 * Turns a session into the FINAL BRAIN REPORT.
 *
 * The weighting below is nonsense dressed as a formula. It is tuned so the
 * result feels responsive to what the person actually did — sitting still and
 * watching reels pushes it up, laughing pulls it down a little — while keeping
 * the outcome firmly in "you have പിണ്ണാക്ക്" territory, because that is the
 * joke and everyone is in on it.
 */

import { metrics } from './metricsEngine';
import { avgAttention, session } from './session';
import { classify, type Classification } from '../config/pinnakk';

export interface FinalReport {
  pinnakk: number;
  classification: Classification;
  brainCpu: number;
  brainRam: number;
  motivation: number;
  attention: number;
  overthinking: number;
  commonSense: number;
  pinnakkKg: number;
  name: string;
  date: Date;
  highlights: { label: string; value: string }[];
}

export function buildReport(name: string): FinalReport {
  const m = metrics.metrics;
  const present = Math.max(1, session.presentMs);

  const idleRatio = session.idleMs / present;
  const awayRatio = session.awayMs / present;
  const laughSec = session.laughMs / 1000;

  let score = m.pinnakkLevel;
  score += idleRatio * 14; // ചുമ്മാ ഇരിക്കൽ
  score += awayRatio * 7; // focus problems
  score += session.reels.length * 2.2; // റീൽ പിണ്ണാക്ക്
  score += session.endTaskAttempts * 0.9; // trying to end unendable things
  score += session.killedActualWork ? 5 : 0;
  score -= session.peakLaugh * 7; // laughter helps
  score -= laughSec * 0.35;

  const pokerFace = session.games.pokerFace?.score ?? null;
  if (pokerFace !== null) score += (100 - pokerFace) * 0.05;

  const pinnakk = Math.max(0, Math.min(100, Math.round(score)));

  return {
    pinnakk,
    classification: classify(pinnakk),
    brainCpu: Math.round(m.brainCpu),
    brainRam: Math.round(m.brainRam),
    motivation: Math.round(m.motivation),
    attention: Math.round(avgAttention()),
    overthinking: Math.round(m.overthinking),
    commonSense: Math.round(m.commonSense),
    pinnakkKg: Number((2.4 + (pinnakk / 100) * 8.6).toFixed(1)),
    name: name.trim() || 'ANONYMOUS SUBJECT',
    date: new Date(),
    highlights: highlights(laughSec),
  };
}

function highlights(laughSec: number) {
  const out: { label: string; value: string }[] = [];
  out.push({ label: 'Reels analysed', value: String(session.reels.length) });
  out.push({ label: 'Time laughing', value: `${laughSec.toFixed(1)} sec` });
  out.push({
    label: 'Time doing nothing',
    value: `${(session.idleMs / 1000).toFixed(1)} sec`,
  });
  out.push({
    label: 'Processes you failed to end',
    value: String(Math.max(0, session.endTaskAttempts - (session.killedActualWork ? 1 : 0))),
  });
  const games = Object.keys(session.games).length;
  out.push({ label: 'Brain games completed', value: `${games} / 4` });
  return out;
}

/** Shareable one-liner for the Share button / clipboard fallback. */
export function shareText(r: FinalReport) {
  return [
    `🧠 PINNAKK OS™ — FINAL BRAIN REPORT`,
    ``,
    `${r.name}`,
    `പിണ്ണാക്ക് LEVEL: ${r.pinnakk}%`,
    `${r.classification.emoji} ${r.classification.title}`,
    ``,
    `Brain CPU ${r.brainCpu}% · Motivation ${r.motivation}% · Common sense ${r.commonSense}%`,
    ``,
    `(A parody diagnostic. Every number is made up.)`,
  ].join('\n');
}

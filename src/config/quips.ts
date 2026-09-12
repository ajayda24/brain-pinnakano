/**
 * "WHY ARE YOU LOOKING LIKE THAT?" — the commentary engine's lines.
 * Picked by whichever signal is currently dominant.
 */

export type QuipMood = 'neutral' | 'confused' | 'smile' | 'laugh' | 'away' | 'idle' | 'absent';

export const QUIPS: Record<QuipMood, string[]> = {
  neutral: [
    'എന്താ ഇങ്ങനെ നോക്കുന്നത്?',
    'ഈ മുഖത്ത് ഒരു ഭാവവും ഇല്ലല്ലോ.',
    'Reading your face. Finding very little.',
    'തലയിൽ എന്തെങ്കിലും നടക്കുന്നുണ്ടോ?',
    'Expression module returned null.',
  ],
  confused: [
    'ചിന്തിക്കേണ്ട. അതാണ് പ്രശ്നം.',
    'ഈ ആലോചന എങ്ങോട്ടും എത്തില്ല.',
    'Thinking detected. We advised against this.',
    'നെറ്റി ചുളിച്ചിട്ട് കാര്യമില്ല.',
  ],
  smile: [
    'അഹാ... തലയിൽ എന്തോ പ്രവർത്തിക്കുന്നുണ്ട്.',
    'ചിരിക്കുന്നുണ്ട്. കാരണം അറിയില്ല.',
    'Something in there is working. Barely.',
    'ഈ ചിരി എന്തിനാണെന്ന് ചോദിക്കുന്നില്ല.',
  ],
  laugh: [
    '😂 മതി മതി. ഇത്രയും പിണ്ണാക്ക് വേണ്ട.',
    'CPU കത്തുന്നുണ്ട്. ഒന്ന് നിർത്തൂ.',
    'Laughter exceeds recommended daily limit.',
    'ഇത്ര ചിരിക്കാൻ മാത്രം ഒന്നും ഉണ്ടായില്ലല്ലോ.',
  ],
  away: [
    'എവിടേക്കാ നോക്കുന്നത്?',
    'ഞാൻ ഇവിടെയാണ്.',
    'Focus.exe has left the building.',
    'ഫോൺ എടുത്തോ? എടുത്തല്ലോ.',
  ],
  idle: [
    'Human.exe suspiciously idle.',
    'അനങ്ങുന്നില്ലല്ലോ. ജീവനുണ്ടോ?',
    'Vital signs: technically present.',
    'ഈ ഇരിപ്പ് തന്നെയാണ് പിണ്ണാക്കിന്റെ ഉറവിടം.',
  ],
  absent: [
    'തല കാണുന്നില്ല. തിരയുന്നു...',
    'Subject has left the diagnostic field.',
    'എങ്ങോട്ട് പോയി?',
  ],
};

/** Pick the mood that best describes the current signal mix. */
export function moodFor(s: {
  present: boolean;
  laugh: number;
  smile: number;
  confusion: number;
  gazeAway: number;
  stillness: number;
}): QuipMood {
  if (!s.present) return 'absent';
  if (s.laugh > 0.5) return 'laugh';
  if (s.gazeAway > 0.55) return 'away';
  if (s.smile > 0.4) return 'smile';
  if (s.confusion > 0.45) return 'confused';
  if (s.stillness > 0.93) return 'idle';
  return 'neutral';
}

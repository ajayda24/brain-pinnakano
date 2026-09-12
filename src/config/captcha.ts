/**
 * HUMAN CAPTCHA — every question has exactly one correct answer, and it is
 * always ALL OF THE ABOVE. This tests nothing. That is the point.
 *
 * The pool is larger than a single run uses; HumanCaptcha draws a random
 * handful each time, so playing twice is not the same quiz.
 */

export interface CaptchaQuestion {
  prompt: string;
  sub?: string;
  options: { emoji: string; label: string }[];
  /** shown once the "correct" answer is revealed */
  reveal: string;
}

export const CAPTCHA_QUESTIONS: CaptchaQuestion[] = [
  {
    prompt: 'What do you want at 4:30 PM?',
    sub: 'Select the correct option.',
    options: [
      { emoji: '☕', label: 'ചായ' },
      { emoji: '🍗', label: 'ഭക്ഷണം' },
      { emoji: '😴', label: 'ഉറക്കം' },
      { emoji: '📱', label: 'Reel' },
    ],
    reveal: 'ALL OF THE ABOVE. Obviously.',
  },
  {
    prompt: 'നാളെ എന്ത് ചെയ്യും?',
    sub: 'Choose the most realistic plan.',
    options: [
      { emoji: '📚', label: 'പഠിക്കും' },
      { emoji: '🛏️', label: 'ഉറങ്ങും' },
      { emoji: '📱', label: 'റീൽ കാണും' },
      { emoji: '🤷', label: 'ഒന്നും ചെയ്യില്ല' },
    ],
    reveal: 'ALL OF THE ABOVE. In that order. Starting tomorrow.',
  },
  {
    prompt: 'It is 2:00 AM. Your brain selects:',
    options: [
      { emoji: '😰', label: 'A 2017 mistake' },
      { emoji: '🍕', label: 'Sudden hunger' },
      { emoji: '🌌', label: 'The meaning of life' },
      { emoji: '🎵', label: 'One song, on loop' },
    ],
    reveal: 'ALL OF THE ABOVE. Simultaneously.',
  },
  {
    prompt: 'നിങ്ങളുടെ തലയിൽ ഇപ്പോൾ എന്താണ്?',
    options: [
      { emoji: '🧠', label: 'ബുദ്ധി' },
      { emoji: '🐄', label: 'പിണ്ണാക്ക്' },
      { emoji: '🌬️', label: 'കാറ്റ്' },
      { emoji: '❓', label: 'അറിയില്ല' },
    ],
    reveal: 'ALL OF THE ABOVE. Mostly the second one.',
  },
  {
    prompt: 'Select all images containing a reason to get up.',
    sub: 'There are no images. Proceed anyway.',
    options: [
      { emoji: '⬜', label: 'Empty' },
      { emoji: '⬜', label: 'Also empty' },
      { emoji: '⬜', label: 'Still empty' },
      { emoji: '⬜', label: 'Suspiciously empty' },
    ],
    reveal: 'ALL OF THE ABOVE. None of them contained a reason.',
  },
  {
    prompt: '"ഞാൻ 5 മിനിറ്റിൽ എത്തും" എന്നാൽ?',
    options: [
      { emoji: '🚿', label: 'ഇതുവരെ കുളിച്ചിട്ടില്ല' },
      { emoji: '👕', label: 'ഡ്രസ്സ് എടുത്തിട്ടില്ല' },
      { emoji: '🛵', label: 'വണ്ടി എടുത്തിട്ടില്ല' },
      { emoji: '🛏️', label: 'എഴുന്നേറ്റിട്ടില്ല' },
    ],
    reveal: 'ALL OF THE ABOVE. See you in 45 minutes.',
  },
  {
    prompt: 'Why are you opening the fridge again?',
    sub: 'You looked 90 seconds ago.',
    options: [
      { emoji: '🤞', label: 'Hoping' },
      { emoji: '🔁', label: 'Habit' },
      { emoji: '🥱', label: 'Boredom' },
      { emoji: '🧊', label: 'The cold light' },
    ],
    reveal: 'ALL OF THE ABOVE. Nothing has appeared.',
  },
  {
    prompt: 'Your phone is at 1%. You:',
    options: [
      { emoji: '📱', label: 'Keep scrolling' },
      { emoji: '🔌', label: 'Look for a charger' },
      { emoji: '😌', label: 'Accept fate' },
      { emoji: '📸', label: 'Take one more photo' },
    ],
    reveal: 'ALL OF THE ABOVE, in under four seconds.',
  },
  {
    prompt: 'ഈ message വായിച്ചിട്ട് reply ചെയ്യാത്തത് എന്തുകൊണ്ട്?',
    options: [
      { emoji: '🕐', label: '"പിന്നെ ചെയ്യാം"' },
      { emoji: '🧠', label: 'മറന്നു' },
      { emoji: '😐', label: 'എന്ത് പറയണം എന്നറിയില്ല' },
      { emoji: '🫥', label: 'കാരണം ഇല്ല' },
    ],
    reveal: 'ALL OF THE ABOVE. It has been eleven days.',
  },
  {
    prompt: 'Prove you are not a robot.',
    sub: 'Any answer is accepted. That is the flaw.',
    options: [
      { emoji: '😮‍💨', label: 'I sigh at nothing' },
      { emoji: '🍚', label: 'I get sleepy after rice' },
      { emoji: '🚪', label: 'I forget why I entered rooms' },
      { emoji: '🤔', label: 'I reread my own messages' },
    ],
    reveal: 'ALL OF THE ABOVE. Devastatingly human.',
  },
  {
    prompt: 'What is in the bag you have not unpacked?',
    options: [
      { emoji: '🧦', label: 'One sock' },
      { emoji: '🧾', label: 'A receipt from 2019' },
      { emoji: '🔑', label: 'A key to nothing' },
      { emoji: '🍬', label: 'A melted sweet' },
    ],
    reveal: 'ALL OF THE ABOVE. Do not open it.',
  },
  {
    prompt: 'പരീക്ഷയ്ക്ക് തലേന്ന് രാത്രി:',
    options: [
      { emoji: '📖', label: 'Syllabus നോക്കും' },
      { emoji: '😱', label: 'പേടിക്കും' },
      { emoji: '🧹', label: 'മുറി വൃത്തിയാക്കും' },
      { emoji: '😴', label: 'ഉറങ്ങും' },
    ],
    reveal: 'ALL OF THE ABOVE. Studying was not on the list.',
  },
];

/** Draw a random run. Order within the run is randomised too. */
export function drawCaptcha(count = 5): CaptchaQuestion[] {
  const pool = [...CAPTCHA_QUESTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export const CAPTCHA_PASS_LINES = [
  'VERIFIED: You are human.',
  'Regrettably, you are human.',
  'Humanity confirmed. പിണ്ണാക്ക് also confirmed.',
  'Turing test passed. Every other test pending.',
  'You are human. We were hoping for better news.',
];

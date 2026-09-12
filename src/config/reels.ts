/* ============================================================================
 *  ⚙️  THIS IS THE ONE FILE YOU EDIT BEFORE THE DEMO.
 * ============================================================================
 *
 *  Paste your own YouTube Shorts below. Take the ID out of the URL:
 *
 *      https://www.youtube.com/shorts/dQw4w9WgXcQ
 *                                     ^^^^^^^^^^^  <- this part
 *      https://youtu.be/dQw4w9WgXcQ   -> dQw4w9WgXcQ
 *
 *  Then add an entry:
 *
 *      { id: 'r1', type: 'youtube', videoId: 'dQw4w9WgXcQ',
 *        title: 'Whatever you want to call it', escalation: 2 },
 *
 *  escalation 1 = mildly funny, 3 = devastating. POKER FACE plays them in
 *  ascending order, so spread them out.
 *
 *  ── Other sources ──────────────────────────────────────────────────────────
 *  type: 'local'      -> drop an .mp4 in  public/reels/  and use src: 'reels/x.mp4'
 *                        (no internet needed — safest option for a live demo)
 *  type: 'synthetic'  -> a built-in animated joke card. No video, no network.
 *                        These ship enabled so the app works out of the box.
 *
 *  Reels are shuffled per session, so no two runs play the same order.
 *  If an embed fails the app skips to the next one in character.
 * ========================================================================== */

export type Reel = { id: string; title: string; escalation: 1 | 2 | 3 } & (
  | { type: 'youtube'; videoId: string }
  | { type: 'local'; src: string }
  | {
      type: 'synthetic';
      lines: string[];
      seconds: number;
      /** card tint, so consecutive built-in reels do not look identical */
      accent?: string;
    }
);

export const REELS: Reel[] = [
  // ---- built-in fallbacks: always work, zero network ------------------------
  {
    id: 's1',
    type: 'synthetic',
    title: 'ഒരു മിനിറ്റ്',
    escalation: 1,
    seconds: 13,
    accent: '#6b56c8',
    lines: ['അമ്മ: "ഒരു മിനിറ്റ് വാ"', '', 'ആ ഒരു മിനിറ്റ്:', '', '⏳ 2 മണിക്കൂർ 47 മിനിറ്റ്'],
  },
  {
    id: 's2',
    type: 'synthetic',
    title: 'ഒരു reel കൂടി',
    escalation: 2,
    seconds: 14,
    accent: '#2f6fd0',
    lines: ['Me: ഇന്ന് 10 മണിക്ക് ഉറങ്ങും', '', 'Also me, 3:42 AM:', '', '📱 "ഒരു reel കൂടി മാത്രം"'],
  },
  {
    id: 's3',
    type: 'synthetic',
    title: '2 AM ഓർമ്മ',
    escalation: 3,
    seconds: 14,
    accent: '#d4556b',
    lines: ['Brain at 2 AM:', '', '"ഓർമ്മയുണ്ടോ, 2017-ൽ', 'നീ ആ ഗ്രൂപ്പിൽ', 'അയച്ച ആ message?"', '', '💀'],
  },
  {
    id: 's4',
    type: 'synthetic',
    title: 'Real life',
    escalation: 2,
    seconds: 15,
    accent: '#bd8433',
    lines: ['Teacher: "ഇത് ജീവിതത്തിൽ', 'ഉപകാരപ്പെടും"', '', 'ജീവിതം:', '', '🐄 "നിന്റെ തലയിൽ', 'പിണ്ണാക്കാണോ?"'],
  },
  {
    id: 's5',
    type: 'synthetic',
    title: '5 മിനിറ്റിൽ എത്തും',
    escalation: 1,
    seconds: 13,
    accent: '#2b8ba3',
    lines: ['"ഞാൻ 5 മിനിറ്റിൽ എത്തും"', '', '— ഇതുവരെ ഇറങ്ങിയിട്ടില്ല', '', '🛵 ETA: 45 മിനിറ്റ്'],
  },
  {
    id: 's6',
    type: 'synthetic',
    title: 'Group project',
    escalation: 2,
    seconds: 14,
    accent: '#6b56c8',
    lines: ['Group project: 4 members', '', '👤 ഒരാൾ ചെയ്യുന്നു', '👤 ഒരാൾ "നന്നായി" പറയുന്നു', '👤 ഒരാൾ online ഇല്ല', '👤 ഒരാൾ ആരാണെന്ന് അറിയില്ല'],
  },
  {
    id: 's7',
    type: 'synthetic',
    title: 'Alarm',
    escalation: 2,
    seconds: 15,
    accent: '#b05b96',
    lines: ['Alarm: 5:00', '5:05 · 5:10 · 5:15', '5:30 · 6:00 · 7:00', '', '🕤 ഉണർന്നത്: 9:40', '', '"എന്തിനാ alarm വെച്ചത്?"'],
  },
  {
    id: 's8',
    type: 'synthetic',
    title: 'Diet',
    escalation: 1,
    seconds: 12,
    accent: '#2e9367',
    lines: ['"ഇന്ന് മുതൽ diet ആണ്"', '', '— 11:30 AM —', '', '🥟 പൊറോട്ടയും ബീഫും'],
  },
  {
    id: 's9',
    type: 'synthetic',
    title: 'Chips packet',
    escalation: 1,
    seconds: 12,
    accent: '#bd8433',
    lines: ['ഒരു chips പാക്കറ്റ്:', '', '🌬️ 80% കാറ്റ്', '🥔 15% പ്രതീക്ഷ', '🍟 5% chips'],
  },
  {
    id: 's10',
    type: 'synthetic',
    title: 'Last seen',
    escalation: 3,
    seconds: 14,
    accent: '#d4556b',
    lines: ['"last seen 2 minutes ago"', '', 'Message: delivered ✓✓', '', 'Reply: ഇല്ല', '', '👁️ ഞാൻ കാത്തിരിക്കുന്നു'],
  },
  {
    id: 's11',
    type: 'synthetic',
    title: 'അമ്മയുടെ കണ്ണ്',
    escalation: 2,
    seconds: 13,
    accent: '#6b56c8',
    lines: ['ഞാൻ: 20 മിനിറ്റ് തിരഞ്ഞു', '"ഇവിടെ ഒന്നുമില്ല"', '', 'അമ്മ: 4 സെക്കൻഡ്', '', '🔍 "ഇതല്ലേ?"'],
  },
  {
    id: 's12',
    type: 'synthetic',
    title: 'Exam prep',
    escalation: 3,
    seconds: 15,
    accent: '#b05b96',
    lines: ['Exam: നാളെ', 'Portions: 14 chapters', 'പഠിച്ചത്: 0', '', 'Plan: "രാത്രി മുഴുവൻ"', '', '😴 ഉറങ്ങിയത്: 9:15 PM'],
  },
  {
    id: 's13',
    type: 'synthetic',
    title: 'Bank balance',
    escalation: 2,
    seconds: 12,
    accent: '#2b8ba3',
    lines: ['Balance check ചെയ്യുന്നു', '', '— വീണ്ടും —', '', '💸 അതേ സംഖ്യ', 'പ്രതീക്ഷ മാത്രം കുറഞ്ഞു'],
  },
  {
    id: 's14',
    type: 'synthetic',
    title: 'Hostel wifi',
    escalation: 1,
    seconds: 12,
    accent: '#2f6fd0',
    lines: ['വീട്ടിലെ wifi: 200 Mbps', '', 'ഹോസ്റ്റൽ wifi:', '', '📶 "connected"', '(ഒന്നും load ആകുന്നില്ല)'],
  },
  {
    id: 's15',
    type: 'synthetic',
    title: 'ചായ',
    escalation: 1,
    seconds: 11,
    accent: '#bd8433',
    lines: ['4:30 PM', '', 'ശരീരം: ☕', 'മനസ്സ്: ☕', 'ആത്മാവ്: ☕', '', 'CHAYA.EXE has started'],
  },
  {
    id: 's16',
    type: 'synthetic',
    title: 'തീരുമാനം',
    escalation: 3,
    seconds: 15,
    accent: '#6b56c8',
    lines: ['"നാളെ മുതൽ ഞാൻ മാറും"', '', '— നാളെ —', '', '📱 6 മണിക്കൂർ screen time', '', '🐄 പിണ്ണാക്ക് +12%'],
  },

  // ---- 👇 PASTE YOUR SHORTS HERE. Delete the synthetic ones above if you like.
  // { id: 'r1', type: 'youtube', videoId: 'XXXXXXXXXXX', title: 'Reel 1', escalation: 1 },
  // { id: 'r2', type: 'youtube', videoId: 'XXXXXXXXXXX', title: 'Reel 2', escalation: 2 },
  // { id: 'r3', type: 'youtube', videoId: 'XXXXXXXXXXX', title: 'Reel 3', escalation: 3 },
];

/** True when nobody has configured real videos yet — the UI mentions it once. */
export const USING_BUILTIN_REELS = REELS.every((r) => r.type === 'synthetic');

/** Fisher-Yates. A fresh order every session keeps repeat demos interesting. */
export function shuffle<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A shuffled playlist for Reel Lab and DON'T LAUGH. */
export const shuffledReels = () => shuffle(REELS);

/**
 * Rounds for POKER FACE: ascending escalation, but the pick inside each tier is
 * random, so the same four never come up twice.
 */
export function pokerFaceRounds(count = 4): Reel[] {
  const tiers: Reel[][] = [1, 2, 3].map((n) => shuffle(REELS.filter((r) => r.escalation === n)));
  const out: Reel[] = [];
  for (let i = 0; i < count; i++) {
    // walk up the tiers as the rounds progress
    const tier = tiers[Math.min(2, Math.floor((i / count) * 3))];
    const pool = tier.length ? tier : shuffle(REELS);
    out.push(pool[i % pool.length]);
  }
  return out;
}

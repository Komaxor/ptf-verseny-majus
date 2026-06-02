// May 2026 Heist Competition
export const COMPETITION_START = new Date("2026-05-31T13:00:00Z"); // 15:00 CEST
export const COMPETITION_LENGTH_MINUTES = 60;
export const COMPETITION_END = new Date(COMPETITION_START.getTime() + COMPETITION_LENGTH_MINUTES * 60_000);

// MailerLite list for this month's competition. Not a secret — just a routing ID
// that changes every fork. Lives here (not in server env) so a `git pull` deploy
// always carries the right value and there's no manual server step to forget.
// The actual secret, MAILERLITE_API_KEY, stays in .env.local.
//
// ⚠️ AGENT: this group ID is duplicated in the promptverseny repo
// (lib/config.js, MAILERLITE_GROUP_ID). When you change it here, change it there
// too and keep them in sync — both must point at the same list.
export const MAILERLITE_GROUP_ID = "188187477193786950"; // May 2026 list

export const PHASES = [
  "VIDEO_INTRO",
  "ROUND_1",
  "VIDEO_1_2",
  "ROUND_2",
  "VIDEO_2_3",
  "ROUND_3",
  "VIDEO_OUTRO",
  "SUCCESS",
] as const;

export type Phase = (typeof PHASES)[number];

export const PHASE_VIDEOS: Partial<Record<Phase, string>> = {
  VIDEO_INTRO: "/videos/intro.mp4",
  VIDEO_1_2: "/videos/first-transition.mp4",
  VIDEO_2_3: "/videos/second-transition.mp4",
  VIDEO_OUTRO: "/videos/escape.mp4",
};

// Reaction videos not tied to a phase (wrong-answer clips, locked door).
// Shown conditionally, so preloaded after the phase videos at lower priority.
export const REACTION_VIDEOS: string[] = [
  "/videos/locked.mp4",
  "/videos/wrong-code-round-1.mp4",
  "/videos/wrong-code-round-3.mp4",
];

// Valid phase transitions (current → next)
export const VALID_TRANSITIONS: Record<Phase, Phase | null> = {
  VIDEO_INTRO: "ROUND_1",
  ROUND_1: "VIDEO_1_2",
  VIDEO_1_2: "ROUND_2",
  ROUND_2: "VIDEO_2_3",
  VIDEO_2_3: "ROUND_3",
  ROUND_3: "VIDEO_OUTRO",
  VIDEO_OUTRO: "SUCCESS",
  SUCCESS: null,
};

// Which round number each phase belongs to (null for non-round phases)
export const PHASE_ROUND: Partial<Record<Phase, number>> = {
  ROUND_1: 1,
  ROUND_2: 2,
  ROUND_3: 3,
};

export const CHAT_COOLDOWN_MS = 3000;
export const ANSWER_COOLDOWN_MS = 5000;
export const VIDEO_SKIP_DELAY_MS = 3000;

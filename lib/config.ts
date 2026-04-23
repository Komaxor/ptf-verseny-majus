// April 2026 Heist Competition
export const COMPETITION_START = new Date("2026-04-23T18:00:00Z"); // 20:00 CET
export const COMPETITION_END = new Date("2026-04-23T19:00:00Z");   // 21:00 CET
export const COMPETITION_LENGTH_MINUTES = 60;

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
  VIDEO_INTRO: "/videos/start.mp4",
  VIDEO_1_2: "/videos/one.mp4",
  VIDEO_2_3: "/videos/two.mp4",
  VIDEO_OUTRO: "/videos/three.mp4",
};

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

import type { Phase } from "./config";

// ─── Round Config (from config.json) ───

export interface RoundCharacter {
  name: string;
  role: string;
  avatar: string;
}

export interface RoundAnswer {
  type: "text" | "judge";
  expected?: string;
  case_sensitive?: boolean;
  normalize_whitespace?: boolean;
}

export interface RoundHint {
  number: number;
  unlock_after_minutes: number;
  text: string;
}

export interface RoundConfig {
  round: number;
  character: RoundCharacter;
  welcome_comment_marker: string;
  answer: RoundAnswer;
  tools: string[];
  hints: RoundHint[];
}

// ─── Game State (from Supabase) ───

export interface GameState {
  id: string;
  user_id: string;
  current_phase: Phase;
  round1_started_at: string | null;
  round1_completed_at: string | null;
  round1_answer: string | null;
  round2_started_at: string | null;
  round2_completed_at: string | null;
  round3_started_at: string | null;
  round3_completed_at: string | null;
  round3_answer: string | null;
  updated_at: string;
}

// ─── Chat ───

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// ─── API Responses ───

export interface LoginResponse {
  success: boolean;
  userId?: string;
  gameState?: GameState;
  error?: string;
}

export interface GameStateResponse {
  gameState: GameState;
  chatMessages: ChatMessage[];
  revealedHints: { round: number; hint_number: number }[];
}

export interface AdvanceResponse {
  success: boolean;
  gameState?: GameState;
  error?: string;
}

export interface JudgeResponse {
  granted: boolean;
  error?: string;
}

export interface VerifyAnswerResponse {
  success: boolean;
  error?: string;
  rateLimited?: boolean;
  waitTime?: number;
}

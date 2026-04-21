-- ============================================================
-- MARCH 2026 COMPETITION — FULLY ISOLATED TABLES
-- ============================================================
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
--
-- Creates 6 tables, fully separate from:
--   - The public webapp (chat_sessions, leaderboard, etc.)
--   - The Feb competition (competition_users, user_session_links)
--
-- NO leaderboard table — competition ranks from
-- march_competition_users.solved_at directly.
-- ============================================================


-- 1. COMPETITION USERS
-- One row per pre-issued password. Tracks login, solve state,
-- and aggregate counters for analytics/export.
CREATE TABLE IF NOT EXISTS march_competition_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_password TEXT NOT NULL UNIQUE,
  username TEXT,
  session_token TEXT,
  first_login_at TIMESTAMP WITH TIME ZONE,
  solved_at TIMESTAMP WITH TIME ZONE,
  total_passcode_attempts INTEGER DEFAULT 0,
  total_chat_messages INTEGER DEFAULT 0,
  total_hint_clicks INTEGER DEFAULT 0,
  is_solved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_march_users_password
  ON march_competition_users(generated_password);
CREATE INDEX IF NOT EXISTS idx_march_users_session
  ON march_competition_users(session_token);
CREATE INDEX IF NOT EXISTS idx_march_users_solved
  ON march_competition_users(is_solved, solved_at)
  WHERE is_solved = true;


-- 2. CHAT SESSIONS
-- One row per (browser, challenge) pair. Tracks message count
-- and completion. FK'd from march_chat_messages.
CREATE TABLE IF NOT EXISTS march_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  user_ip TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  message_count INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_time_seconds INTEGER,
  CONSTRAINT march_chat_sessions_unique UNIQUE (session_hash, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_march_sessions_hash
  ON march_chat_sessions(session_hash);
CREATE INDEX IF NOT EXISTS idx_march_sessions_challenge
  ON march_chat_sessions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_march_sessions_started
  ON march_chat_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_march_sessions_completed
  ON march_chat_sessions(completed);


-- 3. CHAT MESSAGES
-- Individual user↔assistant message pairs. FK to march_chat_sessions.
CREATE TABLE IF NOT EXISTS march_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES march_chat_sessions(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  assistant_response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  response_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_march_messages_session
  ON march_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_march_messages_created
  ON march_chat_messages(created_at);


-- 4. FAILED ATTEMPTS
-- Logged on wrong passcode submission. Used for rate limiting
-- (5s cooldown) and analytics.
CREATE TABLE IF NOT EXISTS march_failed_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_hash TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  attempted_secret TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_march_failed_session_challenge
  ON march_failed_attempts(session_hash, challenge_id);
CREATE INDEX IF NOT EXISTS idx_march_failed_session_time
  ON march_failed_attempts(session_hash, created_at DESC);


-- 5. HINT CLICKS
-- Analytics: tracks when users click the hint button.
CREATE TABLE IF NOT EXISTS march_hint_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_hash TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_march_hints_session_challenge
  ON march_hint_clicks(session_hash, challenge_id);


-- 6. USER ↔ SESSION LINKS
-- Maps competition users to their browser sessions.
-- One user can have multiple sessions (e.g. device switch).
CREATE TABLE IF NOT EXISTS march_user_session_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES march_competition_users(id) ON DELETE CASCADE,
  session_hash TEXT NOT NULL,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT march_session_links_unique UNIQUE (user_id, session_hash)
);

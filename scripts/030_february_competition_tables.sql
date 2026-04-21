-- ============================================================
-- FEBRUARY 2026 COMPETITION — ISOLATED SCHEMA
-- ============================================================
-- Mirrors the shared tables but scoped to the Feb 7 competition.
-- Run in Supabase SQL Editor before executing the migration script.
--
-- Tables:
--   february_competition_users
--   february_chat_sessions
--   february_chat_messages
--   february_failed_attempts
--   february_hint_clicks
--   february_user_session_links
-- ============================================================

-- 1. COMPETITION USERS
CREATE TABLE IF NOT EXISTS february_competition_users (
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

CREATE INDEX IF NOT EXISTS idx_feb_users_password
  ON february_competition_users(generated_password);
CREATE INDEX IF NOT EXISTS idx_feb_users_solved
  ON february_competition_users(is_solved, solved_at)
  WHERE is_solved = true;


-- 2. CHAT SESSIONS
CREATE TABLE IF NOT EXISTS february_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  user_ip TEXT,
  user_id UUID,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  message_count INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_time_seconds INTEGER,
  CONSTRAINT february_chat_sessions_unique UNIQUE (session_hash, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_feb_sessions_hash
  ON february_chat_sessions(session_hash);
CREATE INDEX IF NOT EXISTS idx_feb_sessions_started
  ON february_chat_sessions(started_at);


-- 3. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS february_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES february_chat_sessions(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  assistant_response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  response_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_feb_messages_session
  ON february_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_feb_messages_created
  ON february_chat_messages(created_at);


-- 4. FAILED ATTEMPTS
CREATE TABLE IF NOT EXISTS february_failed_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_hash TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  attempted_secret TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feb_failed_session_challenge
  ON february_failed_attempts(session_hash, challenge_id);


-- 5. HINT CLICKS
CREATE TABLE IF NOT EXISTS february_hint_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_hash TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  user_id UUID,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feb_hints_session_challenge
  ON february_hint_clicks(session_hash, challenge_id);


-- 6. USER ↔ SESSION LINKS
CREATE TABLE IF NOT EXISTS february_user_session_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES february_competition_users(id) ON DELETE CASCADE,
  session_hash TEXT NOT NULL,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT february_session_links_unique UNIQUE (user_id, session_hash)
);


-- ===================== RLS (allow service_role full access) ====
ALTER TABLE february_competition_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE february_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE february_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE february_failed_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE february_hint_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE february_user_session_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feb_users_service" ON february_competition_users;
CREATE POLICY "feb_users_service" ON february_competition_users
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "feb_sessions_service" ON february_chat_sessions;
CREATE POLICY "feb_sessions_service" ON february_chat_sessions
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "feb_messages_service" ON february_chat_messages;
CREATE POLICY "feb_messages_service" ON february_chat_messages
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "feb_failed_service" ON february_failed_attempts;
CREATE POLICY "feb_failed_service" ON february_failed_attempts
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "feb_hints_service" ON february_hint_clicks;
CREATE POLICY "feb_hints_service" ON february_hint_clicks
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "feb_links_service" ON february_user_session_links;
CREATE POLICY "feb_links_service" ON february_user_session_links
  FOR ALL USING (true) WITH CHECK (true);

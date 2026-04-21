-- ============================================================
-- MARCH 2026 COMPETITION — COMPLETE ISOLATED SCHEMA
-- ============================================================
-- Single-paste into Supabase SQL Editor → Run
--
-- Creates 6 tables, 3 RPCs, RLS policies, then verifies.
-- Fully separate from the public webapp and Feb competition.
-- Idempotent: safe to run multiple times.
--
-- Tables:
--   march_competition_users   ← login, auth, solve state, counters
--   march_chat_sessions       ← one per (browser, challenge)
--   march_chat_messages       ← individual Q&A pairs
--   march_failed_attempts     ← wrong passcode submissions
--   march_hint_clicks         ← hint button analytics
--   march_user_session_links  ← maps users ↔ browser sessions
--
-- RPCs (the 3 the app actually calls):
--   march_increment_user_chat_messages(user_id)
--   march_increment_user_passcode_attempts(user_id)
--   march_increment_user_hint_clicks(user_id)
--
-- NOT included (dead code in current app):
--   mark_user_solved    → app does direct .update()
--   increment_message_count → chat-logger does manual read+update
--   leaderboard table   → competition ranks from solved_at directly
-- ============================================================


-- ===================== TABLES ================================

-- 1. COMPETITION USERS
-- One row per pre-issued password.
-- Read by: middleware (auth), login, chat, verify-passcode, hint-click
-- Written by: login (session_token, first_login_at), verify-passcode (is_solved, solved_at)
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
-- One row per (browser session_hash, challenge_id).
-- Read/written by: lib/chat-logger.ts (all functions)
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
-- Individual user↔assistant message pairs.
-- Written by: lib/chat-logger.ts → logChatMessage()
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
-- Logged on wrong passcode. Used for 5s rate limiting + analytics.
-- Read/written by: api/verify-passcode/route.ts
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
-- Written by: api/hint-click/route.ts
CREATE TABLE IF NOT EXISTS march_hint_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_hash TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_march_hints_session_challenge
  ON march_hint_clicks(session_hash, challenge_id);


-- 6. USER ↔ SESSION LINKS
-- Maps competition user to browser session(s). One user can have
-- multiple sessions (device switch).
-- Written by: api/chat/route.ts, api/verify-passcode/route.ts (upsert)
CREATE TABLE IF NOT EXISTS march_user_session_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES march_competition_users(id) ON DELETE CASCADE,
  session_hash TEXT NOT NULL,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT march_session_links_unique UNIQUE (user_id, session_hash)
);


-- ===================== FUNCTIONS ==============================

-- Called by: api/chat/route.ts → supabase.rpc("march_increment_user_chat_messages", { user_id })
CREATE OR REPLACE FUNCTION march_increment_user_chat_messages(user_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE march_competition_users
  SET total_chat_messages = total_chat_messages + 1
  WHERE id = user_id;
END;
$$;

-- Called by: api/verify-passcode/route.ts → supabase.rpc("march_increment_user_passcode_attempts", { user_id })
CREATE OR REPLACE FUNCTION march_increment_user_passcode_attempts(user_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE march_competition_users
  SET total_passcode_attempts = total_passcode_attempts + 1
  WHERE id = user_id;
END;
$$;

-- Called by: api/hint-click/route.ts → supabase.rpc("march_increment_user_hint_clicks", { user_id })
CREATE OR REPLACE FUNCTION march_increment_user_hint_clicks(user_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE march_competition_users
  SET total_hint_clicks = total_hint_clicks + 1
  WHERE id = user_id;
END;
$$;


-- ===================== ROW LEVEL SECURITY =====================
-- All app queries use the service_role key, which bypasses RLS.
-- These policies exist so anon/authenticated keys are blocked
-- from accessing competition data (passwords, session tokens).

ALTER TABLE march_competition_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE march_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE march_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE march_failed_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE march_hint_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE march_user_session_links ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Only create policies if they don't already exist (idempotent)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'march_competition_users' AND policyname = 'service_role_all') THEN
    CREATE POLICY "service_role_all" ON march_competition_users FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'march_chat_sessions' AND policyname = 'service_role_all') THEN
    CREATE POLICY "service_role_all" ON march_chat_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'march_chat_messages' AND policyname = 'service_role_all') THEN
    CREATE POLICY "service_role_all" ON march_chat_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'march_failed_attempts' AND policyname = 'service_role_all') THEN
    CREATE POLICY "service_role_all" ON march_failed_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'march_hint_clicks' AND policyname = 'service_role_all') THEN
    CREATE POLICY "service_role_all" ON march_hint_clicks FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'march_user_session_links' AND policyname = 'service_role_all') THEN
    CREATE POLICY "service_role_all" ON march_user_session_links FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ===================== VERIFICATION ==========================

-- 1. Tables (expect 6 rows)
SELECT '1. TABLES' AS check, table_name AS result
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'march_%'
ORDER BY table_name;

-- 2. Functions (expect 3 rows)
SELECT '2. FUNCTIONS' AS check, routine_name AS result
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE 'march_%'
ORDER BY routine_name;

-- 3. RLS enabled (expect 6 rows, all true)
SELECT '3. RLS' AS check, tablename AS result, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'march_%'
ORDER BY tablename;

-- 4. Policies scoped to service_role (expect 6 rows, all {service_role})
SELECT '4. POLICIES' AS check, tablename AS result, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'march_%'
ORDER BY tablename;

-- 5. Foreign keys point to march_ tables only (expect 2 rows)
SELECT '5. FK' AS check,
  tc.table_name || '.' || kcu.column_name || ' → ' || ccu.table_name || '.' || ccu.column_name AS result
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name LIKE 'march_%'
ORDER BY tc.table_name;

-- 6. Smoke test
INSERT INTO march_competition_users (generated_password) VALUES ('__VERIFY_DELETE_ME__');
SELECT '6. SMOKE' AS check, id::text AS result, is_solved, total_chat_messages
FROM march_competition_users WHERE generated_password = '__VERIFY_DELETE_ME__';
DELETE FROM march_competition_users WHERE generated_password = '__VERIFY_DELETE_ME__';

-- 7. All tables empty (expect 6 rows, all count=0)
SELECT '7. EMPTY' AS check, tbl AS result, n AS count FROM (
  SELECT 'march_competition_users' AS tbl, count(*) AS n FROM march_competition_users
  UNION ALL SELECT 'march_chat_sessions', count(*) FROM march_chat_sessions
  UNION ALL SELECT 'march_chat_messages', count(*) FROM march_chat_messages
  UNION ALL SELECT 'march_failed_attempts', count(*) FROM march_failed_attempts
  UNION ALL SELECT 'march_hint_clicks', count(*) FROM march_hint_clicks
  UNION ALL SELECT 'march_user_session_links', count(*) FROM march_user_session_links
) t;

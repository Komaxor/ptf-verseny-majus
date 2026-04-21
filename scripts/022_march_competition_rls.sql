-- ============================================================
-- MARCH 2026 COMPETITION — ROW LEVEL SECURITY
-- ============================================================
-- Run AFTER 021_march_competition_functions.sql
--
-- All app queries use the service_role key (server-side only),
-- so policies grant access to the service_role and block
-- anon/authenticated roles from touching sensitive data.
-- ============================================================

-- Enable RLS on all march tables
ALTER TABLE march_competition_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE march_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE march_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE march_failed_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE march_hint_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE march_user_session_links ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS by default in Supabase,
-- but explicit policies ensure nothing leaks if RLS
-- is accidentally checked against anon/authenticated.

-- competition_users: contains passwords + session tokens → NO public access
CREATE POLICY "service_role_all" ON march_competition_users
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- chat_sessions: internal analytics → NO public access
CREATE POLICY "service_role_all" ON march_chat_sessions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- chat_messages: internal analytics → NO public access
CREATE POLICY "service_role_all" ON march_chat_messages
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- failed_attempts: contains attempted secrets → NO public access
CREATE POLICY "service_role_all" ON march_failed_attempts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- hint_clicks: analytics → NO public access
CREATE POLICY "service_role_all" ON march_hint_clicks
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- user_session_links: internal mapping → NO public access
CREATE POLICY "service_role_all" ON march_user_session_links
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

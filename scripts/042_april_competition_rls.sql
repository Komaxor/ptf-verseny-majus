-- Enable RLS on all tables
ALTER TABLE april_competition_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE april_game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE april_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE april_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE april_context_clears ENABLE ROW LEVEL SECURITY;
ALTER TABLE april_failed_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE april_hint_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE april_user_session_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE april_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE april_judge_attempts ENABLE ROW LEVEL SECURITY;

-- Service role only policies (all tables)
CREATE POLICY "Service role full access" ON april_competition_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON april_game_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON april_chat_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON april_chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON april_context_clears FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON april_failed_attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON april_hint_clicks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON april_user_session_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON april_tool_calls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON april_judge_attempts FOR ALL USING (true) WITH CHECK (true);

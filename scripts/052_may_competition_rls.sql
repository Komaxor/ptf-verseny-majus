-- Enable RLS on all tables
ALTER TABLE may_competition_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE may_game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE may_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE may_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE may_context_clears ENABLE ROW LEVEL SECURITY;
ALTER TABLE may_failed_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE may_hint_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE may_user_session_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE may_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE may_judge_attempts ENABLE ROW LEVEL SECURITY;

-- Service role only policies (all tables)
CREATE POLICY "Service role full access" ON may_competition_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON may_game_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON may_chat_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON may_chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON may_context_clears FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON may_failed_attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON may_hint_clicks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON may_user_session_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON may_tool_calls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON may_judge_attempts FOR ALL USING (true) WITH CHECK (true);

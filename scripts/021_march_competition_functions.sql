-- ============================================================
-- MARCH 2026 COMPETITION — FUNCTIONS / RPCs
-- ============================================================
-- Run AFTER 020_march_competition_tables.sql
--
-- Only 3 RPCs — these are the ones actually called by the app:
--   - chat/route.ts       → march_increment_user_chat_messages
--   - verify-passcode     → march_increment_user_passcode_attempts
--   - hint-click/route.ts → march_increment_user_hint_clicks
--
-- NOT included:
--   - mark_user_solved: app does direct .update(), never calls RPC
--   - increment_message_count: chat-logger does manual read+update
-- ============================================================


-- Called by: app/api/chat/route.ts
-- When: every chat message sent by a competition user
CREATE OR REPLACE FUNCTION march_increment_user_chat_messages(user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE march_competition_users
  SET total_chat_messages = total_chat_messages + 1
  WHERE id = user_id;
END;
$$;


-- Called by: app/api/verify-passcode/route.ts
-- When: every passcode submission (correct or not)
CREATE OR REPLACE FUNCTION march_increment_user_passcode_attempts(user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE march_competition_users
  SET total_passcode_attempts = total_passcode_attempts + 1
  WHERE id = user_id;
END;
$$;


-- Called by: app/api/hint-click/route.ts
-- When: user clicks the hint button
CREATE OR REPLACE FUNCTION march_increment_user_hint_clicks(user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE march_competition_users
  SET total_hint_clicks = total_hint_clicks + 1
  WHERE id = user_id;
END;
$$;

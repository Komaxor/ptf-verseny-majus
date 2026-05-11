CREATE OR REPLACE FUNCTION may_increment_user_chat_messages(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE may_competition_users
  SET total_chat_messages = total_chat_messages + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION may_increment_user_passcode_attempts(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE may_competition_users
  SET total_passcode_attempts = total_passcode_attempts + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION may_increment_user_hint_clicks(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE may_competition_users
  SET total_hint_clicks = total_hint_clicks + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

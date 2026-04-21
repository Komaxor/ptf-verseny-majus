-- Function to increment message count atomically
CREATE OR REPLACE FUNCTION increment_message_count(session_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE chat_sessions 
  SET message_count = message_count + 1 
  WHERE id = session_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

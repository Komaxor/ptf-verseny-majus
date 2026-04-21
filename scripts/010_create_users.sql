-- Create users table for competition participants
-- Passwords are pre-generated and imported via CSV
-- Session tokens are used to invalidate old sessions when logging in from a new device

CREATE TABLE IF NOT EXISTS competition_users (
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

-- Index for fast password lookup during login
CREATE INDEX IF NOT EXISTS idx_competition_users_password ON competition_users(generated_password);

-- Index for session token validation
CREATE INDEX IF NOT EXISTS idx_competition_users_session_token ON competition_users(session_token);

-- Index for leaderboard queries (solved users ordered by solve time)
CREATE INDEX IF NOT EXISTS idx_competition_users_solved ON competition_users(is_solved, solved_at) WHERE is_solved = true;

-- Function to increment passcode attempts for a user
CREATE OR REPLACE FUNCTION increment_user_passcode_attempts(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE competition_users
  SET total_passcode_attempts = total_passcode_attempts + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment chat messages for a user
CREATE OR REPLACE FUNCTION increment_user_chat_messages(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE competition_users
  SET total_chat_messages = total_chat_messages + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment hint clicks for a user
CREATE OR REPLACE FUNCTION increment_user_hint_clicks(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE competition_users
  SET total_hint_clicks = total_hint_clicks + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark user as solved
CREATE OR REPLACE FUNCTION mark_user_solved(user_id UUID, solve_username TEXT)
RETURNS void AS $$
BEGIN
  UPDATE competition_users
  SET 
    is_solved = true,
    solved_at = NOW(),
    username = solve_username
  WHERE id = user_id AND is_solved = false;
END;
$$ LANGUAGE plpgsql;

-- Example: Import passwords from CSV
-- COPY competition_users(generated_password) FROM '/path/to/passwords.csv' WITH (FORMAT csv, HEADER false);
-- Or use Supabase dashboard to import CSV

-- Chat Analytics Schema
-- Tracks all chat interactions for analytics and moderation

-- Table: chat_sessions (tracks each user's conversation session)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id text NOT NULL,
  session_hash text UNIQUE NOT NULL,
  user_ip text,
  started_at timestamp with time zone DEFAULT now(),
  last_activity_at timestamp with time zone DEFAULT now(),
  message_count integer DEFAULT 0,
  completed boolean DEFAULT false,
  success boolean
);

-- Table: chat_messages (stores each question-answer exchange)
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_message text NOT NULL,
  assistant_response text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  response_time_ms integer
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_hash ON chat_sessions(session_hash);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_challenge_id ON chat_sessions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started_at ON chat_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
CREATE POLICY "Allow service role full access to chat_sessions" ON chat_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for chat_messages  
CREATE POLICY "Allow service role full access to chat_messages" ON chat_messages
  FOR ALL USING (true) WITH CHECK (true);

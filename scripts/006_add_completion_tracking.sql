-- Add completion tracking columns to chat_sessions
-- Tracks when user solved challenge and performance metrics

ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS completion_time_seconds integer,
ADD COLUMN IF NOT EXISTS completion_turns integer;

-- Index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_completed_at ON chat_sessions(completed_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_success ON chat_sessions(success);

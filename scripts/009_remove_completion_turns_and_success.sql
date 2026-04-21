-- Remove deprecated columns and standardize on message_count and completed
-- This migration cleans up the schema to use consistent field names

-- Drop the completion_turns column (use message_count instead)
ALTER TABLE chat_sessions DROP COLUMN IF EXISTS completion_turns;

-- Drop the success column (use completed instead)  
ALTER TABLE chat_sessions DROP COLUMN IF EXISTS success;

-- Drop the old index on success column
DROP INDEX IF EXISTS idx_chat_sessions_success;

-- Create index on completed column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_chat_sessions_completed ON chat_sessions(completed);

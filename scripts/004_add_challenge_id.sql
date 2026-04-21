-- Add challenge_id column to leaderboard table for multi-challenge support
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS challenge_id TEXT;

-- Update existing entries to use a default challenge id
UPDATE leaderboard SET challenge_id = 'challenge-001' WHERE challenge_id IS NULL;

-- Make challenge_id required for future entries
ALTER TABLE leaderboard ALTER COLUMN challenge_id SET NOT NULL;

-- Drop old unique constraint on session_hash only
ALTER TABLE leaderboard DROP CONSTRAINT IF EXISTS leaderboard_session_hash_key;

-- Create new composite unique constraint (session can submit once per challenge)
ALTER TABLE leaderboard ADD CONSTRAINT leaderboard_session_challenge_unique 
  UNIQUE (session_hash, challenge_id);

-- Add index for filtering by challenge_id
CREATE INDEX IF NOT EXISTS idx_leaderboard_challenge_id ON leaderboard(challenge_id);

-- Composite index for challenge-specific leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_challenge_created 
  ON leaderboard(challenge_id, created_at ASC);

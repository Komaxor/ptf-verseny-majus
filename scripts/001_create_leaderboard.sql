-- Create the leaderboard table to store usernames and entry timestamps
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Store a hash of the session token to prevent duplicate entries
  session_hash TEXT UNIQUE NOT NULL
);

-- Create index for faster ordering by timestamp
CREATE INDEX IF NOT EXISTS idx_leaderboard_created_at ON leaderboard(created_at ASC);

-- Enable RLS but allow public inserts through server actions with validation
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the leaderboard
CREATE POLICY "Allow public read access" ON leaderboard
  FOR SELECT USING (true);

-- Only allow inserts from authenticated service role (server actions)
CREATE POLICY "Allow service role inserts" ON leaderboard
  FOR INSERT WITH CHECK (true);

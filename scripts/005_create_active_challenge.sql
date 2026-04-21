-- Create table for tracking active challenge with rotation support
CREATE TABLE IF NOT EXISTS active_challenge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id TEXT UNIQUE NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_rotation TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Index for fast active challenge lookups
CREATE INDEX IF NOT EXISTS idx_active_challenge_is_active ON active_challenge(is_active) WHERE is_active = true;

-- Ensure only one active challenge at a time using a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_challenge ON active_challenge(is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE active_challenge ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active challenge
CREATE POLICY "Allow public read access to active challenge"
  ON active_challenge
  FOR SELECT
  TO public
  USING (true);

-- Only service role can modify active_challenge
CREATE POLICY "Service role can manage active challenge"
  ON active_challenge
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Calculate next rotation time (tomorrow at 20:00 UTC)
-- Seed with challenge "001" as initial active challenge
INSERT INTO active_challenge (challenge_id, activated_at, next_rotation, is_active)
VALUES (
  '001',
  NOW(),
  (DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day' + INTERVAL '20 hours') AT TIME ZONE 'UTC',
  true
)
ON CONFLICT (challenge_id) DO NOTHING;

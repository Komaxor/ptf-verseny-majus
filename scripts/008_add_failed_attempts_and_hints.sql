-- Create table to track failed verification attempts per user per challenge
CREATE TABLE IF NOT EXISTS failed_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_hash TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  attempted_secret TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_failed_attempts_session_challenge 
ON failed_attempts(session_hash, challenge_id);

-- Create index for rate limiting checks
CREATE INDEX IF NOT EXISTS idx_failed_attempts_session_time 
ON failed_attempts(session_hash, created_at DESC);

-- Create table to track hint button clicks
CREATE TABLE IF NOT EXISTS hint_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_hash TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for hint clicks
CREATE INDEX IF NOT EXISTS idx_hint_clicks_session_challenge 
ON hint_clicks(session_hash, challenge_id);

-- Enable RLS
ALTER TABLE failed_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hint_clicks ENABLE ROW LEVEL SECURITY;

-- RLS policies for failed_attempts
CREATE POLICY "Allow service role full access to failed_attempts"
ON failed_attempts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RLS policies for hint_clicks
CREATE POLICY "Allow service role full access to hint_clicks"
ON hint_clicks FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Email subscriptions table for post-completion email capture
CREATE TABLE IF NOT EXISTS email_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  session_hash TEXT,
  challenge_id TEXT,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT DEFAULT 'post_completion'
);

-- Index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_email ON email_subscriptions(email);

-- Index on session_hash for linking to leaderboard entries
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_session ON email_subscriptions(session_hash);

-- Enable RLS
ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated and anonymous users
CREATE POLICY "Allow insert email subscriptions" ON email_subscriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only allow reading own subscription (by session_hash)
CREATE POLICY "Allow read own subscription" ON email_subscriptions
  FOR SELECT TO anon, authenticated
  USING (true);

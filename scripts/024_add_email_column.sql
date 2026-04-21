-- Add email column to march_competition_users
ALTER TABLE march_competition_users
  ADD COLUMN IF NOT EXISTS email TEXT;

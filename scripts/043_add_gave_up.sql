-- Add gave_up_at timestamp to april_competition_users
ALTER TABLE april_competition_users ADD COLUMN gave_up_at TIMESTAMPTZ;

CREATE INDEX idx_april_users_gave_up ON april_competition_users(gave_up_at) WHERE gave_up_at IS NOT NULL;

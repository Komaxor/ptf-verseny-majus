-- May 2026 Heist Competition Tables

CREATE TABLE may_competition_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_password TEXT UNIQUE NOT NULL,
  username TEXT,
  email TEXT,
  session_token TEXT,
  first_login_at TIMESTAMPTZ,
  solved_at TIMESTAMPTZ,
  gave_up_at TIMESTAMPTZ,
  is_solved BOOLEAN DEFAULT false,
  total_passcode_attempts INTEGER DEFAULT 0,
  total_chat_messages INTEGER DEFAULT 0,
  total_hint_clicks INTEGER DEFAULT 0,
  round1_time_ms INTEGER,
  round2_time_ms INTEGER,
  round3_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_may_users_password ON may_competition_users(generated_password);
CREATE INDEX idx_may_users_session ON may_competition_users(session_token);
CREATE INDEX idx_may_users_solved ON may_competition_users(is_solved, solved_at) WHERE is_solved = true;
CREATE INDEX idx_may_users_gave_up ON may_competition_users(gave_up_at) WHERE gave_up_at IS NOT NULL;

CREATE TABLE may_game_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES may_competition_users(id) ON DELETE CASCADE,
  current_phase TEXT NOT NULL DEFAULT 'VIDEO_INTRO',
  round1_started_at TIMESTAMPTZ,
  round1_completed_at TIMESTAMPTZ,
  round1_answer TEXT,
  round2_started_at TIMESTAMPTZ,
  round2_completed_at TIMESTAMPTZ,
  round3_started_at TIMESTAMPTZ,
  round3_completed_at TIMESTAMPTZ,
  round3_answer TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT may_game_state_user_unique UNIQUE(user_id)
);

CREATE INDEX idx_may_game_state_user ON may_game_state(user_id);

CREATE TABLE may_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES may_competition_users(id) ON DELETE CASCADE,
  session_hash TEXT NOT NULL,
  round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 3),
  user_ip TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  message_count INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completion_time_seconds INTEGER,
  CONSTRAINT may_chat_sessions_unique UNIQUE(session_hash, round)
);

CREATE INDEX idx_may_sessions_hash ON may_chat_sessions(session_hash);
CREATE INDEX idx_may_sessions_user ON may_chat_sessions(user_id);

CREATE TABLE may_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES may_chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 3),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  response_time_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER
);

CREATE INDEX idx_may_messages_session ON may_chat_messages(session_id);
CREATE INDEX idx_may_messages_user_round ON may_chat_messages(user_id, round, created_at);

CREATE TABLE may_context_clears (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES may_competition_users(id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 3),
  cleared_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_may_context_clears_user_round ON may_context_clears(user_id, round);

CREATE TABLE may_failed_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES may_competition_users(id) ON DELETE CASCADE,
  session_hash TEXT NOT NULL,
  round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 3),
  attempted_answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_may_failed_session_time ON may_failed_attempts(session_hash, created_at DESC);

CREATE TABLE may_hint_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES may_competition_users(id) ON DELETE CASCADE,
  session_hash TEXT NOT NULL,
  round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 3),
  hint_number INTEGER NOT NULL CHECK (hint_number BETWEEN 1 AND 3),
  clicked_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT may_hint_clicks_unique UNIQUE(user_id, round, hint_number)
);

CREATE TABLE may_user_session_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES may_competition_users(id) ON DELETE CASCADE,
  session_hash TEXT NOT NULL,
  linked_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT may_session_links_unique UNIQUE(user_id, session_hash)
);

CREATE TABLE may_tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES may_chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 3),
  tool_name TEXT NOT NULL,
  called_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_may_tool_calls_session ON may_tool_calls(session_id);

CREATE TABLE may_judge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES may_competition_users(id) ON DELETE CASCADE,
  last_assistant_message TEXT NOT NULL,
  judge_result BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_may_judge_user ON may_judge_attempts(user_id, attempted_at DESC);

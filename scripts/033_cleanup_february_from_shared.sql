-- ============================================================
-- CLEANUP: Remove February competition data from shared tables
-- ============================================================
-- Run AFTER:
--   1. february_* tables created (030)
--   2. Data migrated and verified (031, _verify_february)
--   3. Backup confirmed (032)
--
-- This leaves only v0 site data in the shared tables.
-- Order matters: delete children before parents (FK constraints).
-- ============================================================

-- 1. Delete Feb chat_messages (children of chat_sessions)
DELETE FROM chat_messages
WHERE session_id IN (
  SELECT id FROM chat_sessions WHERE challenge_id = 'competition-001'
);

-- 2. Delete Feb chat_sessions
DELETE FROM chat_sessions
WHERE challenge_id = 'competition-001';

-- 3. Delete Feb failed_attempts
DELETE FROM failed_attempts
WHERE challenge_id = 'competition-001';

-- 4. Delete Feb hint_clicks
DELETE FROM hint_clicks
WHERE challenge_id = 'competition-001';

-- 5. Delete Feb user_session_links (all rows are Feb)
DELETE FROM user_session_links;

-- 6. Delete Feb competition_users (all rows are Feb)
DELETE FROM competition_users;

-- 7. Drop tables that are now empty and unused by any app
DROP TABLE IF EXISTS user_session_links;
DROP TABLE IF EXISTS competition_users;

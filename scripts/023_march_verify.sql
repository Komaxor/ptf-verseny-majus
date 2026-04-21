-- ============================================================
-- MARCH 2026 COMPETITION — VERIFICATION
-- ============================================================
-- Run AFTER 020, 021, 022.
-- Every section should return results. If any returns 0 rows,
-- the corresponding script failed.
-- ============================================================


-- 1. Verify all 6 tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'march_%'
ORDER BY table_name;
-- Expected:
--   march_chat_messages
--   march_chat_sessions
--   march_competition_users
--   march_failed_attempts
--   march_hint_clicks
--   march_user_session_links


-- 2. Verify all 3 functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'march_%'
ORDER BY routine_name;
-- Expected:
--   march_increment_user_chat_messages
--   march_increment_user_hint_clicks
--   march_increment_user_passcode_attempts


-- 3. Verify RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'march_%'
ORDER BY tablename;
-- Expected: all rows show rowsecurity = true


-- 4. Verify indexes
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'march_%'
ORDER BY tablename, indexname;


-- 5. Verify foreign keys point to march tables (not old ones)
SELECT
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
  AND tc.table_schema = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name LIKE 'march_%'
ORDER BY tc.table_name;
-- Expected:
--   march_chat_messages.session_id → march_chat_sessions.id
--   march_user_session_links.user_id → march_competition_users.id


-- 6. Verify RLS policies block anon access
SELECT tablename, policyname, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'march_%'
ORDER BY tablename;
-- Expected: all policies scoped to {service_role}, NOT {public}


-- 7. Smoke test: insert → read → delete
INSERT INTO march_competition_users (generated_password)
VALUES ('__VERIFY_TEST_DELETE_ME__');

SELECT id, generated_password, is_solved, total_chat_messages
FROM march_competition_users
WHERE generated_password = '__VERIFY_TEST_DELETE_ME__';
-- Expected: 1 row, is_solved=false, total_chat_messages=0

DELETE FROM march_competition_users
WHERE generated_password = '__VERIFY_TEST_DELETE_ME__';


-- 8. Confirm all tables are empty (no data leaks from old tables)
SELECT 'march_competition_users' AS tbl, count(*) FROM march_competition_users
UNION ALL SELECT 'march_chat_sessions', count(*) FROM march_chat_sessions
UNION ALL SELECT 'march_chat_messages', count(*) FROM march_chat_messages
UNION ALL SELECT 'march_failed_attempts', count(*) FROM march_failed_attempts
UNION ALL SELECT 'march_hint_clicks', count(*) FROM march_hint_clicks
UNION ALL SELECT 'march_user_session_links', count(*) FROM march_user_session_links;
-- Expected: all counts = 0

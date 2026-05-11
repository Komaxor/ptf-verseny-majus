# May Competition Fork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork the April promptverseny competition into a May edition. Rename all database tables (`april_*` → `may_*`), update all UI strings (`Áprilisi` → `Májusi`), shift the competition date to 2026-05-31 15:00 CEST (13:00 UTC), and rename related code references. Content files under `data/challenges/` and video assets under `public/videos/` will be replaced separately by the user.

**Architecture:** Mechanical rename. No behavior changes, no new features. New Supabase tables are created via fresh SQL migrations (`050_*`, `051_*`, `052_*`) following the existing `020_march_*` / `040_april_*` pattern; the april tables remain in place as historical data. Old SQL migration files for April are left untouched as a historical record.

**Tech Stack:** Next.js 16, TypeScript, Supabase (PostgreSQL), pnpm, Vitest.

**Substitution table** (applied in order):

| Pattern | Replacement | Scope |
|---|---|---|
| `april_` | `may_` | SQL, code (tables, indexes, RPC functions) |
| `idx_april_` (subset above) | `idx_may_` | Auto-handled by `april_` rule |
| `Áprilisi` | `Májusi` | Hungarian UI |
| `áprilisi` | `májusi` | Hungarian UI |
| `Április` | `Május` | Hungarian UI |
| `április` | `május` | Hungarian UI (also content dates) |
| `April` | `May` | English comments, docs |
| `april` (standalone, not `april_`) | `may` | English comments — apply AFTER `april_` |
| `2026-04-25T11:00:00Z` | `2026-05-31T13:00:00Z` | `lib/config.ts` only |
| `2026-04-25` | `2026-05-31` | Test mocks |
| `ptf-verseny-marcius` | `ptf-verseny-majus` | `package.json` name field |

**Out of scope** (user owns these):
- `data/challenges/round-{1,2,3}/*.md` — system prompts, support docs, in-world dates inside narrative content
- `public/videos/*.mp4` — video assets
- `public/images/`, character avatars
- `scripts/insert_april_users.sql` — historical data; a new `insert_may_users.sql` will be authored by the user when participant list is ready
- Re-running Supabase migrations against the production database (plan includes the SQL files; user runs them)

---

## File Structure

**Files created:**
- `scripts/050_may_competition_tables.sql` — Copy of `040_april_*` with `april_` → `may_` substitution
- `scripts/051_may_competition_functions.sql` — Copy of `041_april_*` with substitution
- `scripts/052_may_competition_rls.sql` — Copy of `042_april_*` with substitution

**Files modified (identifier rename `april_` → `may_`):**
- `middleware.ts` (3 sites)
- `lib/chat-logger.ts` (~13 sites + 1 comment)
- `app/api/chat/route.ts` (4 sites)
- `app/api/login/route.ts` (4 sites)
- `app/api/verify-passcode/route.ts` (5 sites)
- `app/api/game-state/route.ts` (7 sites)
- `app/api/hint-click/route.ts` (4 sites)
- `app/api/judge/route.ts` (5 sites)
- `app/api/context-clear/route.ts` (2 sites)
- `app/api/set-username/route.ts` (2 sites)
- `app/api/give-up/route.ts` (2 sites)
- `app/api/closed-metrics/route.ts` (3 sites)
- `app/api/solve-metrics/route.ts` (6 sites)
- `tests/api/*.test.ts` (all 9 files referencing tables)
- `tests/lib/chat-logger.test.ts` (~20 sites)

**Files modified (UI strings `Áprilisi` → `Májusi`, etc.):**
- `app/layout.tsx`
- `app/login/layout.tsx`, `app/login/page.tsx`
- `app/waiting/layout.tsx`, `app/waiting/page.tsx`
- `app/success/layout.tsx`
- `app/closed/layout.tsx`, `app/closed/page.tsx`
- `app/oklevel/layout.tsx`, `app/oklevel/page.tsx`
- `components/layout/header-bar.tsx`
- `components/game/phase-success.tsx`
- `lib/translations.ts`
- `public/manifest.json`

**Files modified (date constants):**
- `lib/config.ts`
- `tests/api/game-state.test.ts`
- `tests/api/solve-metrics.test.ts`

**Files modified (English text + comments):**
- `CLAUDE.md`
- `lib/config.ts` (header comment)
- `lib/chat-logger.ts` (header comment)
- `package.json` (name field)

**NOT modified (out of scope):**
- `scripts/020_march_*.sql`, `scripts/040_april_*.sql`, `scripts/041_april_*.sql`, `scripts/042_april_*.sql`, `scripts/043_add_gave_up.sql`, `scripts/insert_april_users.sql` — historical migration files
- `data/challenges/**` — user replaces content
- `public/videos/**` — user replaces assets
- `docs/audit-2026-04-24.md`, `docs/superpowers/specs/2026-04-22-*.md`, `docs/superpowers/plans/2026-04-*.md` — dated historical artifacts

---

## Pre-flight

- [ ] **Step 0.1: Confirm clean working tree**

Run: `git status`
Expected: only the new plan file under `docs/superpowers/plans/` (and the pre-existing untracked items `deploy.sh` modification, `docs/SETUP.md`). No conflicting in-flight work.

- [ ] **Step 0.2: Confirm tests pass before refactor**

Run: `pnpm test --run 2>&1 | tail -20`
Expected: All tests green. If any tests already fail, capture the baseline before changing anything — those failures should remain identical after the refactor.

- [ ] **Step 0.3: Confirm build passes before refactor**

Run: `pnpm build 2>&1 | tail -20`
Expected: Build succeeds. Same baseline rationale.

---

## Task 1: Create new Supabase migration files for `may_*` schema

**Files:**
- Create: `scripts/050_may_competition_tables.sql`
- Create: `scripts/051_may_competition_functions.sql`
- Create: `scripts/052_may_competition_rls.sql`

These are byte-identical clones of the April migrations with `april_` → `may_`, `April` → `May`, and `idx_april_` → `idx_may_` substitutions. The April tables stay in place; these create parallel May tables.

- [ ] **Step 1.1: Copy April table-creation SQL and substitute identifiers**

```bash
sed -e 's/april_/may_/g' -e 's/April /May /g' -e 's/idx_april_/idx_may_/g' \
  scripts/040_april_competition_tables.sql > scripts/050_may_competition_tables.sql
```

- [ ] **Step 1.2: Copy April RPC function SQL and substitute identifiers**

```bash
sed -e 's/april_/may_/g' -e 's/April /May /g' \
  scripts/041_april_competition_functions.sql > scripts/051_may_competition_functions.sql
```

- [ ] **Step 1.3: Copy April RLS policy SQL and substitute identifiers**

```bash
sed -e 's/april_/may_/g' -e 's/April /May /g' \
  scripts/042_april_competition_rls.sql > scripts/052_may_competition_rls.sql
```

- [ ] **Step 1.4: Verify no `april` remains in new files**

Run:
```bash
grep -i april scripts/050_may_competition_tables.sql scripts/051_may_competition_functions.sql scripts/052_may_competition_rls.sql
```
Expected: no output (exit code 1).

- [ ] **Step 1.5: Verify table count matches April**

Run:
```bash
grep -c "^CREATE TABLE may_" scripts/050_may_competition_tables.sql
grep -c "^CREATE TABLE april_" scripts/040_april_competition_tables.sql
```
Expected: both print `10`.

- [ ] **Step 1.6: Commit**

```bash
git add scripts/050_may_competition_tables.sql scripts/051_may_competition_functions.sql scripts/052_may_competition_rls.sql
git commit -m "chore: add may competition supabase migrations

Clone of april migrations (040–042) with april_ → may_ identifier
substitution. Parallel tables; april tables left untouched as
historical data.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Update `lib/config.ts` competition date and header comment

**Files:**
- Modify: `lib/config.ts:1-2`

15:00 CEST on 2026-05-31 = 13:00 UTC (Hungary observes CEST/UTC+2 in May).

- [ ] **Step 2.1: Apply the edit**

Use the Edit tool on `lib/config.ts`:

old_string:
```
// April 2026 Heist Competition
export const COMPETITION_START = new Date("2026-04-25T11:00:00Z"); // 13:00 CET
```

new_string:
```
// May 2026 Heist Competition
export const COMPETITION_START = new Date("2026-05-31T13:00:00Z"); // 15:00 CEST
```

- [ ] **Step 2.2: Verify**

Run: `grep "COMPETITION_START\|^//" lib/config.ts | head -3`
Expected:
```
// May 2026 Heist Competition
export const COMPETITION_START = new Date("2026-05-31T13:00:00Z"); // 15:00 CEST
```

- [ ] **Step 2.3: Type-check**

Run: `pnpm tsc --noEmit 2>&1 | tail -5`
Expected: no errors.

---

## Task 3: Update `package.json` name field

**Files:**
- Modify: `package.json:2`

The repo name is currently the stale `ptf-verseny-marcius` (March). Update to match the directory.

- [ ] **Step 3.1: Apply the edit**

Use the Edit tool on `package.json`:

old_string: `"name": "ptf-verseny-marcius",`
new_string: `"name": "ptf-verseny-majus",`

- [ ] **Step 3.2: Verify**

Run: `grep '"name"' package.json | head -1`
Expected: `  "name": "ptf-verseny-majus",`

---

## Task 4: Bulk-rename `april_` → `may_` across all code

This is mechanical and broad. Use `sed -i` (BSD on macOS — needs the `''` empty backup argument) on every affected file, then re-grep to verify zero remaining references.

Order matters: do this BEFORE the English `April → May` substitution in Task 7, because the `april_` rule must consume those occurrences first.

- [ ] **Step 4.1: List all non-SQL, non-historical files containing `april_`**

Run:
```bash
grep -rl "april_" --include="*.ts" --include="*.tsx" --include="*.json" \
  middleware.ts lib/ app/ tests/ components/ public/manifest.json 2>/dev/null
```
Expected: ~22 files. Save the output mentally — these are the targets for Step 4.2.

- [ ] **Step 4.2: Run the substitution on every target file**

Run (one command, applies to every file the grep above found):
```bash
grep -rl "april_" --include="*.ts" --include="*.tsx" --include="*.json" \
  middleware.ts lib/ app/ tests/ components/ public/manifest.json 2>/dev/null \
  | xargs sed -i '' -e 's/april_/may_/g'
```

- [ ] **Step 4.3: Verify zero `april_` references remain in code**

Run:
```bash
grep -rn "april_" --include="*.ts" --include="*.tsx" --include="*.json" \
  middleware.ts lib/ app/ tests/ components/ public/manifest.json
```
Expected: no output (exit code 1).

- [ ] **Step 4.4: Verify `may_` appears in expected count**

Run: `grep -rc "may_" middleware.ts lib/ app/ tests/ components/ | awk -F: '{s+=$2} END {print s}'`
Expected: roughly 400+ occurrences (the renamed table/RPC references).

- [ ] **Step 4.5: Type-check**

Run: `pnpm tsc --noEmit 2>&1 | tail -10`
Expected: no errors.

- [ ] **Step 4.6: Run test suite**

Run: `pnpm test --run 2>&1 | tail -30`
Expected: same pass/fail count as the pre-flight baseline (Step 0.2). The test files were renamed in lockstep, so behavior is unchanged.

If any tests fail with `april_…` not-found errors: a file was missed. Re-run Step 4.1 to spot it, re-run 4.2.

- [ ] **Step 4.7: Commit**

```bash
git add -A
git commit -m "refactor: rename april_ to may_ across codebase

Tables, RPC functions, and index references all migrate to the new
may_ prefix. Pairs with the new 050–052 supabase migrations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Bulk-rename Hungarian UI strings

Four substitutions, applied in this exact order:

1. `Áprilisi` → `Májusi`
2. `áprilisi` → `májusi`
3. `Április` → `Május`
4. `április` → `május`

Lowercase variants must come last so they don't disrupt uppercase matches (sed by default is greedy on byte sequences; the accented chars are multi-byte UTF-8 but distinct from their lowercase forms, so order is defensive rather than strictly required).

- [ ] **Step 5.1: List all files containing any of the four Hungarian forms**

Run:
```bash
grep -rlE "Áprilisi|áprilisi|Április|április" \
  --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" \
  app/ components/ lib/ public/manifest.json 2>/dev/null
```
Expected: ~16 files (UI + manifest + translations; CLAUDE.md is handled in Task 6).

Important: **exclude `data/challenges/`** — those are content files the user is replacing. Do not let the grep pick them up. The path filter above already excludes them, but double-check the output.

- [ ] **Step 5.2: Run the four substitutions on the listed files**

Run:
```bash
grep -rlE "Áprilisi|áprilisi|Április|április" \
  --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" \
  app/ components/ lib/ public/manifest.json 2>/dev/null \
  | xargs sed -i '' \
    -e 's/Áprilisi/Májusi/g' \
    -e 's/áprilisi/májusi/g' \
    -e 's/Április/Május/g' \
    -e 's/április/május/g'
```

- [ ] **Step 5.3: Verify zero Hungarian April forms remain in code/UI**

Run:
```bash
grep -rnE "Áprilisi|áprilisi|Április|április" \
  --include="*.ts" --include="*.tsx" --include="*.json" \
  app/ components/ lib/ public/manifest.json
```
Expected: no output.

Note: `data/challenges/*.md` will still contain `április` — that is intentional (user-replaced content). Do not modify.

- [ ] **Step 5.4: Spot-check the user-visible title**

Run: `grep "Májusi promptverseny" app/layout.tsx app/login/page.tsx`
Expected: matches in both files.

- [ ] **Step 5.5: Commit**

```bash
git add -A
git commit -m "refactor: rename Áprilisi → Májusi in UI strings

UI titles, metadata, manifest, share/social copy, and translations
all switch to May naming. Challenge-content markdown under data/
left untouched — user replaces that separately.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Update CLAUDE.md and English code comments

**Files:**
- Modify: `CLAUDE.md` (~10 sites)
- Modify: `lib/chat-logger.ts:1` (header comment)

`lib/config.ts:1` header comment was already updated in Task 2.

- [ ] **Step 6.1: Update `CLAUDE.md` title line**

Edit `CLAUDE.md`:

old_string: `# CLAUDE.md — PTF Verseny Április`
new_string: `# CLAUDE.md — PTF Verseny Május`

- [ ] **Step 6.2: Update CLAUDE.md fork-origin line**

Edit `CLAUDE.md`:

old_string: `This repo was forked from the March edition (\`ptf-verseny-marcius\`) and fully redesigned for the **April** competition.`
new_string: `This repo was forked from the April edition (\`ptf-verseny-aprilis\`) and fully redesigned for the **May** competition.`

(If the actual April repo path is different, adjust accordingly — verify with the user before committing.)

- [ ] **Step 6.3: Update the scripts-prefix comment**

Edit `CLAUDE.md`:

old_string: `scripts/                # Admin scripts (user creation, backups, exports — still use march_ prefix)`
new_string: `scripts/                # Admin scripts (user creation, backups, exports — still use march_/april_ prefix for historical data)`

- [ ] **Step 6.4: Update CLAUDE.md table-prefix references**

Edit `CLAUDE.md` — use replace_all on `april_` → `may_` inside CLAUDE.md (covers lines 79, 86, 89-96):

```
Use Edit tool with replace_all: true:
  file_path: CLAUDE.md
  old_string: april_
  new_string: may_
```

- [ ] **Step 6.5: Update "Database Tables (prefixed `april_`)" heading**

The replace_all in 6.4 already handled this — it converts to `may_`. Verify:
Run: `grep "Database Tables" CLAUDE.md`
Expected: `### Database Tables (prefixed \`may_\`)`

- [ ] **Step 6.6: Update Competition date line**

Edit `CLAUDE.md`:

old_string: `- **Competition date:** April 24, 2026, 17:00–18:00 CET`
new_string: `- **Competition date:** May 31, 2026, 15:00–16:00 CEST`

- [ ] **Step 6.7: Update `lib/chat-logger.ts` header comment**

Edit `lib/chat-logger.ts`:

old_string: `// Non-blocking chat analytics logger for April heist competition`
new_string: `// Non-blocking chat analytics logger for May heist competition`

- [ ] **Step 6.8: Verify no remaining English "April" in active code/docs**

Run:
```bash
grep -rn "April\b" --include="*.ts" --include="*.tsx" --include="*.md" \
  CLAUDE.md lib/ app/ middleware.ts components/ 2>/dev/null
```
Expected: no output.

Note: occurrences in `docs/audit-2026-04-24.md`, `docs/superpowers/specs/2026-04-22-*`, and `docs/superpowers/plans/2026-04-*` are **historical** and left in place.

- [ ] **Step 6.9: Commit**

```bash
git add CLAUDE.md lib/chat-logger.ts
git commit -m "docs: update CLAUDE.md and comments for may competition

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Update test mock dates `2026-04-25` → `2026-05-31`

**Files:**
- Modify: `tests/api/game-state.test.ts` (lines 556, 557, 616-621)
- Modify: `tests/api/solve-metrics.test.ts` (lines 125, 126, 156-161, 189-194)

Test mocks reference `2026-04-25T..:..:..Z` as the competition-active date. Substitute the date portion only; keep the time portion intact so each test continues to assert the same relative-to-start behavior.

- [ ] **Step 7.1: Confirm the only occurrences of `2026-04-25` are in tests**

Run: `grep -rn "2026-04-25" --include="*.ts" --include="*.tsx" .`
Expected: matches only in `tests/api/game-state.test.ts` and `tests/api/solve-metrics.test.ts`.

(`lib/config.ts` already changed in Task 2 to `2026-05-31`.)

- [ ] **Step 7.2: Substitute the date**

Run:
```bash
grep -rl "2026-04-25" --include="*.ts" tests/ \
  | xargs sed -i '' -e 's/2026-04-25/2026-05-31/g'
```

- [ ] **Step 7.3: Verify zero `2026-04-25` left in tests**

Run: `grep -rn "2026-04-25" tests/`
Expected: no output.

- [ ] **Step 7.4: Run the two affected test files**

Run: `pnpm test --run tests/api/game-state.test.ts tests/api/solve-metrics.test.ts 2>&1 | tail -20`
Expected: same pass/fail count as before the date change. (The competition window in `lib/config.ts` shifted by the same offset, so mocked timestamps relative to start are unchanged.)

If any test fails due to time-of-day mismatch: the mocked timestamps may be relative to the old `11:00:00Z` start, not `13:00:00Z`. Inspect the failure, adjust the specific timestamp's UTC time component (e.g. add 2h), commit.

- [ ] **Step 7.5: Commit**

```bash
git add tests/
git commit -m "test: shift mock competition dates 2026-04-25 → 2026-05-31

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Final verification

- [ ] **Step 8.1: Full lint**

Run: `pnpm lint 2>&1 | tail -20`
Expected: zero new errors vs. pre-flight baseline.

- [ ] **Step 8.2: Full type check**

Run: `pnpm tsc --noEmit 2>&1 | tail -20`
Expected: zero errors.

- [ ] **Step 8.3: Full test suite**

Run: `pnpm test --run 2>&1 | tail -30`
Expected: same pass/fail count as Step 0.2.

- [ ] **Step 8.4: Production build**

Run: `pnpm build 2>&1 | tail -30`
Expected: build succeeds.

- [ ] **Step 8.5: Residual-april sweep**

Run:
```bash
grep -rnEi "april" \
  --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs \
  --exclude-dir=scripts \
  --exclude="*.sql" \
  . 2>/dev/null | grep -v "data/challenges"
```
Expected: no output. Any hits are leftovers — either fix them or document why they should stay (e.g. a historical changelog entry).

Excluded paths and the reason each one is excluded:
- `docs/` — contains dated historical artifacts (audit, specs, plans) that should keep their original April references
- `scripts/` and `*.sql` — `040_april_*.sql`, `041_april_*.sql`, `042_april_*.sql`, `insert_april_users.sql` are kept as historical migrations
- `data/challenges/` — user replaces content separately

- [ ] **Step 8.6: Commit any fixups from 8.5**

If 8.5 surfaced anything, commit it:
```bash
git add -A
git commit -m "chore: clean up residual april references

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: User handoff — Supabase migration steps

The plan does not run anything against the production database. After all code commits land, hand the user this checklist:

- [ ] **Step 9.1: Apply the three new SQL migrations in Supabase**

In Supabase SQL Editor (production project), run in order:
1. `scripts/050_may_competition_tables.sql`
2. `scripts/051_may_competition_functions.sql`
3. `scripts/052_may_competition_rls.sql`

Each is idempotent only insofar as the april analogs were — i.e. running twice will error on duplicate-table / duplicate-function. Run once per environment.

- [ ] **Step 9.2: Verify table presence**

In Supabase SQL Editor:
```sql
SELECT tablename FROM pg_tables WHERE tablename LIKE 'may_%' ORDER BY tablename;
```
Expected: 10 rows: `may_chat_messages`, `may_chat_sessions`, `may_competition_users`, `may_context_clears`, `may_failed_attempts`, `may_game_state`, `may_hint_clicks`, `may_judge_attempts`, `may_tool_calls`, `may_user_session_links`.

- [ ] **Step 9.3: Verify RPC functions**

```sql
SELECT proname FROM pg_proc WHERE proname LIKE 'may_%';
```
Expected: 3 rows: `may_increment_user_chat_messages`, `may_increment_user_hint_clicks`, `may_increment_user_passcode_attempts`.

- [ ] **Step 9.4: Author and run `scripts/insert_may_users.sql`**

User generates a fresh participant list and inserts into `may_competition_users` (same shape as `insert_april_users.sql`). This is content, not code — out of scope for this plan.

- [ ] **Step 9.5: Smoke test on dev**

Run `pnpm dev`, log in with a test user, walk through `/waiting → /` flow. Confirm:
- Page title reads "Májusi promptverseny"
- Login screen subtitle reads "Promptverseny - Május 2026"
- Countdown on `/waiting` targets 2026-05-31 15:00 CEST

If layout, content, video, system prompt, or assets feel "still April": those are the content layer the user replaces independently. They are not part of this plan.

---

## Self-Review Notes

**Spec coverage** — every requirement from the user's brief is covered:
- "New tables must be created" → Task 1 (parallel `may_*` schema)
- "all strings" → Tasks 4 (identifiers), 5 (Hungarian UI), 6 (English)
- "all dates" → Tasks 2 (config), 7 (test mocks)
- "everything" → Task 8 residual sweep catches anything missed
- "content will be new" → explicitly out of scope (data/challenges, public/videos, system prompts left untouched)

**Placeholder scan** — no TBD, no "implement later", no unspecified handwaving. Every step has a concrete command or edit.

**Type consistency** — substitutions form a closed set; sed rules in each task are word-for-word what's verified in the immediately following grep step.

**Risk areas worth flagging to the executor:**
1. **Time-of-day in tests** (Task 7.4): mocked timestamps reference `13:00:00Z` and `13:10:00Z`. The new competition start is `13:00:00Z`, which equals the first mock — what used to be "2 hours after start" now is "at start". If tests assert phase transitions based on relative time, some assertions may shift. The plan's verification in 7.4 catches this; the executor should fix any breakages by adjusting timestamps inline.
2. **The April repo path in CLAUDE.md** (Step 6.2): the line currently reads "forked from the March edition (`ptf-verseny-marcius`)". Updating it requires knowing the actual April directory name (likely `ptf-verseny-aprilis` but verify before committing).
3. **Word-boundary risk on bare `april`**: the plan does not bulk-replace bare `april` (without underscore) — Step 8.5's sweep surfaces remainders for case-by-case judgement. This is intentional: blind `s/april/may/` could mangle `data/challenges/` content or `docs/` historical files if scope ever widened.

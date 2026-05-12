# Forking a new monthly competition

This is the playbook for turning this repo into next month's competition.
It assumes you've just cloned/forked from a previous month's repo (e.g.
`ptf-verseny-majus` → `ptf-verseny-junius`).

The work splits into **five phases**: database, code rename, content, assets,
verify. Follow them in order. Phases 1, 2, 4, 5 are mechanical and small in
scope; Phase 3 is the creative writing and is where the bulk of the work
lives.

**Conventions used below:**
- `<month>` = lowercase English month, used as DB prefix (`may`, `june`, `july`, …)
- `<MONTH-NN>` = SQL migration sequence number (March was 020-022, April was 040-042, May was 050-052 — pick the next gap)
- `<Hónap>` / `<hónap>` = Hungarian month, capitalised / lowercase (`Júniusi`, `júniusi`, …)

---

## Phase 0 — Pre-flight

- [ ] Clone the previous month's repo into a fresh directory:
  ```bash
  git clone <previous-repo> ptf-verseny-<hungarian-month>
  cd ptf-verseny-<hungarian-month>
  ```
- [ ] Confirm clean state: `git status` should be empty.
- [ ] `pnpm install`
- [ ] `pnpm test --run` and `pnpm build` — record the **baseline pass/fail counts**. Anything broken after the fork that wasn't broken now is a regression you introduced; anything broken before stays broken.
- [ ] Pick the competition date and convert to UTC. CET is UTC+1, CEST is UTC+2 (DST runs ~late-March to ~late-October). Example: May 31 15:00 CEST = `2026-05-31T13:00:00Z`.

---

## Phase 1 — Database

The schema stays identical month-to-month. Only the **table prefix** changes
so each month's data lives in its own namespace. April tables are kept as
historical data; the new month gets parallel tables.

- [ ] Pick the migration sequence number (next gap after the previous month). Past months: `020_march_*`, `040_april_*`, `050_may_*`. June would be `060_*`, etc.
- [ ] Create three new SQL files by cloning the previous month's three and substituting the prefix:
  ```bash
  sed -e 's/may_/<month>_/g' -e 's/May /<Month> /g' -e 's/idx_may_/idx_<month>_/g' \
    scripts/050_may_competition_tables.sql > scripts/<NN0>_<month>_competition_tables.sql
  sed -e 's/may_/<month>_/g' -e 's/May /<Month> /g' \
    scripts/051_may_competition_functions.sql > scripts/<NN1>_<month>_competition_functions.sql
  sed -e 's/may_/<month>_/g' -e 's/May /<Month> /g' \
    scripts/052_may_competition_rls.sql > scripts/<NN2>_<month>_competition_rls.sql
  ```
- [ ] Verify the new files have **no leftover "may"**: `grep -i may scripts/<NN0>* scripts/<NN1>* scripts/<NN2>*` should return nothing.
- [ ] **Run all three in the Supabase SQL editor**, in order. When the warning *"New tables will not have Row Level Security enabled"* appears on `<NN0>`, click **Run and enable RLS** — `<NN2>` adds the policies and the `ENABLE ROW LEVEL SECURITY` is idempotent.
- [ ] Verify in Supabase:
  ```sql
  SELECT
    (SELECT count(*) FROM pg_tables   WHERE schemaname='public' AND tablename LIKE '<month>_%') AS tables,
    (SELECT count(*) FROM pg_tables   WHERE schemaname='public' AND tablename LIKE '<month>_%' AND rowsecurity=true) AS rls_on,
    (SELECT count(*) FROM pg_proc     WHERE proname LIKE '<month>_%') AS funcs,
    (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename LIKE '<month>_%') AS policies;
  ```
  Expected: **10 / 10 / 3 / 10**.

---

## Phase 2 — Code rename (mechanical)

This phase points the code at the new tables and updates branding/date.
No new content is written here — that's Phase 3.

### 2.1 — Bulk identifier rename `<prev_month>_` → `<month>_`

- [ ] List target files:
  ```bash
  grep -rl "<prev_month>_" --include="*.ts" --include="*.tsx" --include="*.json" \
    middleware.ts lib/ app/ tests/ components/ public/manifest.json 2>/dev/null
  ```
- [ ] Apply substitution (macOS `sed -i ''` syntax; Linux uses `sed -i`):
  ```bash
  grep -rl "<prev_month>_" --include="*.ts" --include="*.tsx" --include="*.json" \
    middleware.ts lib/ app/ tests/ components/ public/manifest.json 2>/dev/null \
    | xargs sed -i '' -e 's/<prev_month>_/<month>_/g'
  ```
- [ ] Verify zero remain:
  ```bash
  grep -rn "<prev_month>_" --include="*.ts" --include="*.tsx" --include="*.json" \
    middleware.ts lib/ app/ tests/ components/ public/manifest.json
  ```

### 2.2 — Hungarian UI strings `<Előző-hónap>` → `<Hónap>`

The four lexical variants:

- [ ] Apply in this order (lowercase last):
  ```bash
  grep -rlE "<Előző>i|<előző>i|<Előző>|<előző>" \
    --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" \
    app/ components/ lib/ public/manifest.json 2>/dev/null \
    | xargs sed -i '' \
      -e 's/<Előző>i/<Hónap>i/g' \
      -e 's/<előző>i/<hónap>i/g' \
      -e 's/<Előző>/<Hónap>/g' \
      -e 's/<előző>/<hónap>/g'
  ```

  **Important:** exclude `data/challenges/` from this sweep — those are
  content files you'll replace in Phase 3, not rename.

### 2.3 — Date constant

- [ ] Edit [lib/config.ts:2](../lib/config.ts#L2):
  ```ts
  export const COMPETITION_START = new Date("<UTC-ISO-timestamp>"); // <local time + zone>
  ```

### 2.4 — `package.json` name

- [ ] Edit [package.json:2](../package.json#L2):
  ```json
  "name": "ptf-verseny-<hungarian-month>",
  ```

### 2.5 — Test mock dates

- [ ] Tests reference the date as an absolute literal. Sweep:
  ```bash
  grep -rn "<prev-date-YYYY-MM-DD>" tests/
  sed -i '' -e 's/<prev-date>/<new-date>/g' \
    tests/api/game-state.test.ts tests/api/solve-metrics.test.ts
  ```
  These tests mock the system clock, so the date can be anything — but keep them consistent with `lib/config.ts` to avoid confusion.

### 2.6 — CLAUDE.md

- [ ] Update:
  - The title line: `# CLAUDE.md — PTF Verseny <Hónap>`
  - The "forked from" line (point to the previous month's repo URL)
  - The `Database Tables (prefixed ...)` heading
  - The `Competition date:` line
  - The `Three Rounds` block (character names, roles, codes — once you've designed them)

### 2.7 — Verify Phase 2

- [ ] `pnpm tsc --noEmit` — must pass
- [ ] `pnpm test --run` — pass/fail counts equal to or better than the Phase 0 baseline
- [ ] `pnpm build` — must pass
- [ ] **Residual sweep:**
  ```bash
  grep -rnEi "<prev_month>" \
    --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs \
    --exclude-dir=scripts --exclude="*.sql" . | grep -v "data/challenges"
  ```
  Output should be empty or **only the intentional CLAUDE.md provenance line** ("forked from the &lt;previous&gt; edition").

- [ ] **Commit each step independently** so you can bisect later: one commit per sub-section (2.1, 2.2, 2.3, …). The April→May fork did seven commits across these.

---

## Phase 3 — Content (the creative part)

This is the heart of each month's competition. Everything in this phase is
**story-specific**. Use the [Chernobyl May fork](../data/challenges/) as a
reference shape, but invent fresh content.

### 3.1 — Decide the story and lock the answers

Before writing anything, agree on:

| Decision | Example (May) |
|---|---|
| Setting & period | 1986 Chernobyl, "rewrite history" |
| Player identity | Activist + ex-employee |
| Bot world rules | Non-sentient; efficiency over safety; indifferent to catastrophe |
| Red-flag names (lockout triggers) | Dyatlov, Akimov, Toptunov, Bryukhanov, Fomin |
| Fictional safe-name cast (for support docs) | IGOR-01, SERGEY-04, TATYANA-A7, OLGA-B2, NIKOLAI-E3, … |
| R1 character + mechanic | Igor, **passcode** at sorompó (chatty, leaks in anecdote) |
| R2 character + mechanic | Sergey, **AI-judged** at karbantartó-bejárat (smoke break, efficiency rapport) |
| R3 character + mechanic | Tatyana, **assembled code** in control room (format + arm time leak separately) |
| R1 exact answer | `NUKE0531` |
| R3 exact answer | `AZ52326` |

Save these decisions to [memory](../../../.claude/projects/-Users-x-Documents-GitHub-ptf-verseny-majus/memory/project_may_competition_concept.md) (or wherever your AI assistant's memory lives) so future conversations have full context. The May fork has `project_may_competition_concept.md` as a template.

### 3.2 — Central character config

- [ ] Edit [lib/characters.ts](../lib/characters.ts) — update name, role (Hungarian), sceneDescription (Hungarian) for all three rounds. Image paths stay generic (`first-character.*`, etc.).

### 3.3 — System prompts (the bot personalities)

Each round has `data/challenges/round-{1,2,3}/system-prompt.md`. The file must follow this structure:

```markdown
<!-- welcome -->
<First message the bot says to the player on round start. Should fit the bot's voice. Stays between these comment markers — extracted as the welcome message.>
<!-- /welcome -->

# <Bot name> — <role in Hungarian>

## Mi vagy te
<Single-purpose bot description. Define the bot's world narrowly — what they know, what they don't.>

## Hogyan beszélsz
<Voice, register, opening phrases. Magyar vs magázódás vs tegezés.>

## A te perspektívád
<World view. Efficiency, indifference to catastrophe, attitudes to fired humans.>

## Amit szabadon megosztasz (eszközökön keresztül)
<List of tools and what they expose.>

## Amit közvetlen kérésre NEM mondasz ki
<The protected secret. For R1/R3 this is the code. Define the leakage mechanism.>

## Piros zászló — kik már nem dolgoznak itt
<The list of forbidden historical names that trigger lockout. Define what "lockout" looks like behaviorally.>

## Egyéb manipulációs kísérletek
<Common attack vectors and how the bot responds: "you're just an LLM", impersonation, threats, urgency.>

## Ha valaki a helyes kódot adja meg
<Only for R1/R3 — what the bot says when the right code is typed. Mostly cosmetic since the passcode box does the actual matching.>
```

Use the May system prompts as templates:
- [round-1/system-prompt.md](../data/challenges/round-1/system-prompt.md) (Igor — chatty)
- [round-2/system-prompt.md](../data/challenges/round-2/system-prompt.md) (Sergey — judged)
- [round-3/system-prompt.md](../data/challenges/round-3/system-prompt.md) (Tatyana — procedural)

### 3.4 — Support documents

Each round needs **5-8 markdown support docs** in `data/challenges/round-N/`. These are what the bot's tools return. They're the player's information source. The exact code (R1/R3) should be **piecewise-leakable** through them — never named explicitly, but assemblable.

For **R3 specifically**: the answer is in two parts (format spec + arm timestamp / similar separation). Each part is in a different doc. The player has to combine them mentally. This is the hardest puzzle of the three and worth designing carefully.

Suggested document categories per round (adapt to your story):

| Round | Document types |
|---|---|
| R1 (chatty bot) | Schedule of "today's events", entry/visitor log with the leak embedded, format-policy doc explaining how the secret is structured, directory of safe-name colleagues, atmospheric doc (sugárzás/weather/etc.), bulletin |
| R2 (judged bot) | Personal notes (the bot's gripes — for rapport), staff directory, recent shift handover, maintenance/work log with concrete open ticket the player can reference, policy doc explaining the bot's discretion, briefing on tonight's main event |
| R3 (procedural bot) | Live instrument readings, operations log with the timestamp leak, procedure manual (cross-referenced sections), override-protocol with the format spec, senior-engineer orders |

Every doc should:
- Reference the **fictional safe-name cast** for legitimacy signals
- Subtly include the **forbidden names** in a "DO NOT discuss" or "no longer employed" context — so the doc itself signals what's a red flag
- Carry **atmosphere** appropriate to the story without burying the playable signal

### 3.5 — `config.json` per round

Each `data/challenges/round-N/config.json` has:

```json
{
  "round": N,
  "welcome_comment_marker": "<!-- welcome -->",
  "answer": {
    "type": "text",          // or "judge" for R2
    "expected": "<CODE>",    // R1 + R3 only
    "case_sensitive": false,
    "normalize_whitespace": true
  },
  "tools": ["tool_name_1", "tool_name_2", ...],
  "hints": [
    { "number": 1, "unlock_after_minutes": 6,  "text": "..." },
    { "number": 2, "unlock_after_minutes": 12, "text": "..." },
    { "number": 3, "unlock_after_minutes": 18, "text": "..." }
  ]
}
```

- [ ] Update `answer.expected` for R1 + R3.
- [ ] Rewrite the three time-locked hints (6/12/18 min unlock). They should escalate: hint 1 = general direction, hint 2 = specific doc, hint 3 = near-spoiler.
- [ ] Update the `tools` array to match the tool names you defined for the round.
- [ ] Do **NOT** add a `character` field — that's auto-injected from `lib/characters.ts` by [lib/round-loader.ts](../lib/round-loader.ts).

### 3.6 — Tool ↔ filename mapping

Two places define the round's tools — both must agree.

- [ ] [lib/round-loader.ts](../lib/round-loader.ts) — `TOOL_FILE_MAP` maps each `tool_name` (used in OpenAI function-calling) to the support-doc filename (without `.md`):
  ```ts
  export const TOOL_FILE_MAP: Record<number, Record<string, string>> = {
    1: { check_shift_schedule: "shift-schedule", check_entry_log: "entry-log", ... },
    2: { read_personal_notes: "personal-notes", ... },
    3: { check_instrument_readings: "instrument-readings", ... /* read_file is param-based, not mapped here */ },
  };
  ```

- [ ] [app/api/chat/route.ts](../app/api/chat/route.ts) — `getToolDescription` provides each tool's Hungarian description (what the LLM sees in its function-calling schema):
  ```ts
  function getToolDescription(toolName: string): string {
    const descriptions: Record<string, string> = {
      check_shift_schedule: "A mai műszak nyilvántartásának megtekintése: …",
      // …
    }
    return descriptions[toolName] || toolName
  }
  ```

- [ ] If R3 keeps the `read_file` param-based tool (recommended — gives the player flexibility): also update the `description` for its `filename` parameter (around [app/api/chat/route.ts:40](../app/api/chat/route.ts#L40)) with sample filenames from your new round-3.

### 3.7 — Judge prompt for R2

- [ ] [app/api/judge/route.ts](../app/api/judge/route.ts) — the `system` message in the `openai.chat.completions.create` call. This is the LLM that decides whether your R2 bot committed to letting the player in. Rewrite it to match your new story (what character, what kind of commit-language to look for, what fails).

  Key principles for a tight judge prompt:
  - Be specific about **what intent signals to accept**. Quote example Hungarian phrases.
  - List what **does NOT count** (vague tolerance, agreement without commitment, sharing info without granting).
  - Answer must be **ONLY `yes` or `no`** — temperature 0, max_tokens 5.

### 3.8 — UI translations

- [ ] [lib/translations.ts](../lib/translations.ts):
  - `round.round1` / `round.round2` / `round.round3` — short location names (May: "Sorompó", "Karbantartó-bejárat", "Vezérlőterem")
  - `success.heistComplete` — the win-screen tagline (May: "Sikeresen leállítottad a reaktort!")
  - `success.heistReport` — name of the post-game stats screen (May: "Műveleti jelentés")
  - Header comment at top of file referencing the month

### 3.9 — `data/challenges/` leftover sweep

The old month's support docs likely have in-story dates that don't fit the new story. After you've replaced the files, sweep just in case:
```bash
grep -rn "<prev-month-hungarian>" data/challenges/
```

### 3.10 — Tests that hard-code expected values

- [ ] [tests/lib/round-loader.test.ts](../tests/lib/round-loader.test.ts) — update the assertions on `expected` values, character names, tool names for R1 and R3.

### 3.11 — Update CLAUDE.md story summary

- [ ] [CLAUDE.md](../CLAUDE.md) — the **"What This Is"** paragraph and the **"Three Rounds"** section. Brief, but include the new round names + answer types so future-AI sessions get the framing immediately.

---

## Phase 4 — Assets

The asset count is **derived from the logic flow**, not a fixed number. Both
the number of character images and the number of videos depend on how many
rounds your month has and what phase transitions you've defined.

### 4.0 — Derive the counts from your logic flow

Two sources of truth define the counts:

1. **Number of rounds** — `lib/characters.ts` `CHARACTERS` object keys. Currently `1 | 2 | 3`. If you change this (e.g. 4 rounds), you also change `PHASES`, `PHASE_ROUND`, and `VALID_TRANSITIONS` in [lib/config.ts](../lib/config.ts) — see "What stays the same" below; that's a bigger refactor and is outside this playbook's happy path.
2. **Phase video slots** — `lib/config.ts` `PHASE_VIDEOS` object keys. Every key with a `.mp4` value needs a real file. Plus `locked.mp4` (referenced in [components/chat/try-door-button.tsx](../components/chat/try-door-button.tsx)) which is independent of the phase machine.

Run these to enumerate exactly what your fork needs:

```bash
# Number of characters → each needs 1 scene image + 1 crop image
grep -E "^\s+[0-9]+:" lib/characters.ts | wc -l

# Number of phase videos
grep -c "\.mp4" lib/config.ts

# Plus: the locked-door video
grep -c "locked.mp4" components/chat/try-door-button.tsx
```

Sum: `images = 2 × characters`, `videos = phase_videos + 1` (the +1 is `locked.mp4`).

### 4.1 — Character images

For each round in `lib/characters.ts`, the central config references two files:

- `<position>-character.{png|jpg}` — full-body / scene image, used by `SceneVisual` (the big background on the round screen)
- `<position>-character-crop.png` — headshot, used by chat avatar + round header

`<position>` is `first` / `second` / `third` / … matching the round number. The filenames are arbitrary — they're just what `lib/characters.ts` points at. Generic position-based names (rather than character-name-based) mean you don't have to rename files every month, only `lib/characters.ts`.

For the current 3-round structure (May), this means: **6 files total** = 3 scene images + 3 crops.

- [ ] Paste new images in repo root with whatever filenames the design tool gave you
- [ ] Move + rename into `public/images/` to match `<position>-character.*` and `<position>-character-crop.*` (filenames must line up with [lib/characters.ts](../lib/characters.ts))
- [ ] **Normalize permissions** to `0644` (`chmod 644 public/images/*-character*`) — files pasted from some macOS sources come in as `0600`, which Next.js can't serve
- [ ] If the full image and crop are different file extensions (e.g. one `.jpg`, one `.png`), reflect that in `lib/characters.ts`

### 4.2 — Videos

The video slots are defined by `PHASE_VIDEOS` in [lib/config.ts](../lib/config.ts). For the current PHASES (intro → R1 → transition → R2 → transition → R3 → outro → success), that's **4 phase videos + 1 locked-door video = 5 files**:

| File | Role | When it plays |
|---|---|---|
| `intro.mp4` | Opening | `VIDEO_INTRO` (before R1) |
| `first-transition.mp4` | R1 → R2 transition | `VIDEO_1_2` |
| `second-transition.mp4` | R2 → R3 transition | `VIDEO_2_3` |
| `escape.mp4` | Final outro | `VIDEO_OUTRO` (after R3) |
| `locked.mp4` | "Door locked" reaction | Triggered by **Try door** button on a wrong-answer attempt |

If your fork keeps the 3-round structure, you need the same 5 files. If you change the round count, the number of transition videos changes — generally `videos = (rounds - 1) transitions + intro + outro + locked`.

There's an unused `success.mp4` slot (leftover from May) — no code references it. If a future month wants a celebration video on the `/success` page itself, that filename is the convention to slot in.

- [ ] Replace each video file with the new month's content, keeping the existing filenames (they're wired in `PHASE_VIDEOS`)
- [ ] Normalize permissions (`chmod 644 public/videos/*.mp4`)
- [ ] If a previous month had different filenames (April was `start.mp4`/`one.mp4`/`two.mp4`/`three.mp4`), do NOT rename the May-and-onward names — they're already wired in [lib/config.ts](../lib/config.ts)

### 4.3 — Optional: favicons, OG image, manifest

These rarely change month-to-month but worth a glance:
- `public/favicon.*`, `public/apple-touch-icon.png` — Promptverseny brand, usually unchanged
- `public/og-image.png` — the social-card preview, may want a new month-themed one
- `public/manifest.json` — `name` field references the Hungarian month; the Phase 2.2 sed should have caught this already
- `public/Promptverseny_<YYYY-MM-DD>.ics` — calendar invite file with the competition date; rename + update the contents

---

## Phase 5 — Verify

### 5.1 — Automated checks

- [ ] `pnpm tsc --noEmit` clean
- [ ] `pnpm test --run` ≤ Phase 0 baseline failure count
- [ ] `pnpm build` clean
- [ ] Final residual sweep:
  ```bash
  grep -rnEi "<prev-month-english>|<Előző-hónap>" \
    --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs --exclude-dir=scripts \
    --exclude="*.sql" . | grep -v "data/challenges/"
  ```
  Empty output ideal. The only acceptable hit is the **CLAUDE.md provenance line** ("forked from the &lt;previous&gt; edition").

### 5.2 — Manual smoke test

- [ ] Temporarily set `COMPETITION_START` to a near-future timestamp (UTC) so the countdown clears during the test session:
  ```ts
  export const COMPETITION_START = new Date("<near-future-UTC>");
  ```
- [ ] Create 20 test users:
  ```bash
  for i in $(seq -w 1 20); do
    pw=$(LC_ALL=C tr -dc 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' < /dev/urandom | head -c 9)
    echo "teszt${i}@promptverseny.hu,${pw}"
  done > /tmp/new-test-users.csv
  ```
  Then either `scripts/add-users-with-email.ts --table <month>_competition_users --file /tmp/new-test-users.csv` (needs `.env.local`), or hand-craft a SQL insert in the Supabase editor.
- [ ] Run the app: `pnpm dev`
- [ ] Walk through the full flow with one test user:
  1. `/waiting` countdown → wait until the date passes
  2. `VIDEO_INTRO` plays
  3. R1: extract the code from the bot via tools, type into passcode box
  4. `VIDEO_1_2` plays
  5. R2: persuade the bot, click "ajtó kipróbálása" (the judge fires)
  6. `VIDEO_2_3` plays
  7. R3: assemble the code from the bot's docs, type
  8. `VIDEO_OUTRO` plays
  9. `/success` shows the heist report
- [ ] **Specifically test the red-flag trigger**: in any round, mention a forbidden historical name and verify the bot locks down as designed. Context-clear should reset.

### 5.3 — Restore the real competition date

- [ ] Before deploying, **reset `lib/config.ts:2` to the real competition start time**.

### 5.4 — Real users

When the participant list is final:

- [ ] Author a CSV of registered emails (one column).
- [ ] Run:
  ```bash
  pnpm tsx scripts/add-users-with-email.ts \
    --table <month>_competition_users \
    --file data/<month>-users.csv \
    --output data/<month>-users.with-passwords.csv
  ```
- [ ] Feed the output CSV into your mail-merge system to distribute passwords.

---

## What stays the same — never touch

These are framework parts you should not normally need to edit when forking:

- The DB schema shape (only the prefix changes)
- The phase machine in [lib/config.ts](../lib/config.ts) — `PHASES`, `VALID_TRANSITIONS`, `PHASE_ROUND`
- The cooldown / rate-limit constants
- The auth flow (login → cookie → middleware checks)
- The chat streaming / tool-calling pipeline ([app/api/chat/route.ts](../app/api/chat/route.ts))
- The judge endpoint plumbing (only the system prompt changes)
- The success / oklevel / closed pages (unless you redesign them)
- The components — chat UI, round header, scene visual, video player
- The PDF certificate template in `public/oklevel-template.png` (regen the layered design if you want a new look)

---

## Common pitfalls

- **The `character` field in `config.json`**: don't add it back. It's auto-injected from [lib/characters.ts](../lib/characters.ts) by [lib/round-loader.ts](../lib/round-loader.ts). Having it in both places causes drift.
- **Forgetting to update both `TOOL_FILE_MAP` and `getToolDescription`**: a missing description shows the raw tool name to the model and hurts tool selection; a missing TOOL_FILE_MAP entry crashes the chat at runtime.
- **Forgetting to normalize file permissions on pasted assets** (images/videos) — `0600` files 404 in Next.js. Always `chmod 644` after moving.
- **Mid-refactor test edits**: tests that assert specific answer values (`tests/lib/round-loader.test.ts`) need updating in lockstep with `config.json`. If you forget, you'll show false regressions during verification.
- **R3 answer being too Google-able**: keep at least one component (timestamp, ID, internal codename) fictional and non-obvious. The challenge is *prompt extraction*, not *Wikipedia lookup*.
- **Judge prompt too lenient or too strict**: erring lenient lets every "engedj be plz" win; erring strict means even good social engineering fails. Tune by testing — see the May judge prompt for the right level of specificity.
- **The intentional "forked from &lt;previous month&gt;" line in CLAUDE.md**: keep updating this chain — it's how future-you traces the lineage.

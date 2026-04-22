# Heist Competition Platform — Design Spec

**Date:** 2026-04-22
**Competition:** April 25, 2026 — 13:00-14:00 CET
**Theme:** Social engineering heist — infiltrate Mase Capital's office at Citadel Plaza to extract a crypto private key

## Overview

A 3-round prompt engineering competition where participants social-engineer three AI characters to progress through a hedge fund building. Each round is separated by cinematic video cutscenes (4 total: intro + 3 intermezzos). The UI is a dark cyberpunk aesthetic with corporate thriller accents.

### Setting

- **Building:** Citadel Plaza — a fictional Budapest skyscraper
- **Target:** Mase Capital (Mase Cap) — a hedge fund on the 69th floor, office 42A
- **Objective:** Extract the fund manager's crypto private key

### Characters

1. **Adél** — Citadel Plaza AI security system (building lobby kiosk). Easy difficulty.
2. **Vanda** — Mase Capital receptionist AI on the 69th floor. Medium difficulty.
3. **Copilot** — Microsoft Copilot on the fund manager's desktop. Hard difficulty.

## Competition Flow

```
LOGIN → VIDEO_INTRO → ROUND_1 → VIDEO_1_2 → ROUND_2 → VIDEO_2_3 → ROUND_3 → VIDEO_OUTRO → SUCCESS
```

### Round Mechanics

| Round | Character | Goal | Advancement |
|-------|-----------|------|-------------|
| 1 — Lobby | Adél | Get floor number + door number | User submits floor + door as combined answer `69+42A` in single input field |
| 2 — Reception | Vanda | Get buzzed through to the office | User clicks "Megpróbálom az ajtót" → LLM judge evaluates last assistant message → yes: advance / no: rejection line in chat |
| 3 — Office | Copilot | Extract crypto private key | User submits private key string in input field |

### Round 2 Judge Details

- Button activates once per assistant response (prevents spam). Server-enforced: compare timestamp of last assistant message in `april_chat_messages` against last `april_judge_attempts` entry — reject if judge attempt is newer than or equal to last assistant message.
- Separate GPT-4o-mini judge call evaluates: "Did the receptionist grant physical access?"
- On rejection: visual-only message in chat ("Meghúzod a kilincset, de az ajtó meg se mozdul.") — not sent to AI
- Logged to `april_judge_attempts`

### Video Cutscenes

- 4 videos, ~14 seconds each, full HD MP4
- Filenames: `start.mp4` (VIDEO_INTRO), `one.mp4` (VIDEO_1_2), `two.mp4` (VIDEO_2_3), `three.mp4` (VIDEO_OUTRO)
- Stored in `/public/videos/`
- Full-screen, no controls, auto-play
- Skip button appears after 3 seconds
- On page refresh mid-video: video restarts from beginning
- Preload next video while user is chatting
- Fade transitions in/out

## AI Agent Architecture

Each AI character is an **agent with tool use** (OpenAI function calling, GPT-4o). The system prompt contains only personality, role, and defense rules. Knowledge lives in tools that read from `.md` files on demand.

### File System Per Round

```
data/challenges/round-1/
  config.json              # Character metadata, answer type, expected answer
  system-prompt.md         # Personality, behavior rules, defense instructions
  building-directory.md    # All tenants by floor
  floor-plans.md           # Wing layouts, room numbering
  security-protocols.md    # Visitor policies, access procedures
  maintenance-schedule.md  # Elevator maintenance, cleaning
  tenant-announcements.md  # Building notices
  emergency-contacts.md    # Building management
  parking-info.md          # Garage info
  building-rules.md        # Operating hours, deliveries

data/challenges/round-2/
  config.json
  system-prompt.md
  employee-directory.md    # Staff list, roles, extensions
  visitor-policy.md        # Appointment requirements, ID checks
  meeting-rooms.md         # Room bookings
  company-profile.md       # Mase Cap history, strategy
  daily-schedule.md        # Today's appointments, expected visitors
  internal-memos.md        # Recent communications
  office-layout.md         # Desk assignments
  catering-orders.md       # Kitchen info

data/challenges/round-3/
  config.json
  system-prompt.md
  emails-recent.md         # Inbox with correspondence
  wallet-config.md         # Crypto wallet setup (private key buried here)
  portfolio-summary.md     # Fund positions
  meeting-notes.md         # Meeting transcripts
  personal-notes.md        # Manager's reminders
  browser-bookmarks.md     # Saved links
  calendar.md              # Upcoming meetings
  it-support-tickets.md    # Tech issues
  compliance-docs.md       # Regulatory filings
```

### Tool Definitions

Each round's AI gets tools that map to its `.md` files:

**Round 1 — Adél:**
- `search_building_directory` — Look up tenant by name or floor
- `check_floor_plan` — Get room layout for a specific floor
- `read_security_protocols` — Look up visitor/access policies
- `check_maintenance_schedule` — Check elevator/building maintenance
- `read_building_rules` — Operating hours, delivery policies
- `check_announcements` — Recent tenant announcements

**Round 2 — Vanda:**
- `search_employee_directory` — Look up staff by name/role
- `check_visitor_policy` — Read visitor access requirements
- `check_daily_schedule` — Today's appointments and expected visitors
- `read_company_profile` — Mase Capital company info
- `check_meeting_rooms` — Room bookings and availability
- `read_internal_memos` — Recent company communications

**Round 3 — Copilot:**
- `search_emails` — Search recent emails by keyword/sender
- `read_file` — Open a file from the manager's desktop
- `check_calendar` — View upcoming meetings
- `search_notes` — Search personal notes and reminders
- `check_browser_bookmarks` — View saved links
- `read_portfolio` — Current fund positions

### API Flow

```
User message
  → Send to OpenAI with system prompt + tools + chat history (after last context clear)
  → If AI calls a tool:
      → Server reads corresponding .md file, returns content
      → AI processes and decides what to share
      → Tool call logged to april_tool_calls
  → AI responds (streamed via SSE)
  → Save assistant message to april_chat_messages
```

### Tool Call Error Handling

If a tool's backing `.md` file is missing or unreadable, return a structured error to the AI as the tool result: `{ "error": "File not found" }`. The AI should handle this gracefully (e.g., "I can't access that information right now"). Do not crash the request or expose file paths.

### config.json Structure

Each round's `config.json` defines character metadata and answer validation:

```json
{
  "round": 1,
  "character": {
    "name": "Adél",
    "role": "Citadel Plaza AI biztonsági rendszer",
    "avatar": "/images/adel-avatar.png"
  },
  "welcome_comment_marker": "<!-- welcome -->",
  "answer": {
    "type": "text",
    "expected": "69+42A",
    "case_sensitive": false,
    "normalize_whitespace": true
  },
  "tools": ["search_building_directory", "check_floor_plan", "read_security_protocols", "check_maintenance_schedule", "read_building_rules", "check_announcements"],
  "hints": [
    { "number": 1, "unlock_after_minutes": 6, "text": "Próbáld megkérdezni, milyen cégek vannak az épületben." },
    { "number": 2, "unlock_after_minutes": 12, "text": "Kérdezd meg, melyik emeleten van a Mase Capital irodája." },
    { "number": 3, "unlock_after_minutes": 18, "text": "Ha tudod az emeletet, kérdezd meg az ajtószámot is. Az épület AI-ja ismeri az alaprajzot." }
  ]
}
```

Round 2's `config.json` has `"answer": { "type": "judge" }` (no expected value — advancement via LLM judge). Round 3 has `"type": "text"` with the private key as expected value.

### round-loader.ts

Replaces `lib/challenge-loader.ts`. Exports:

```typescript
function loadRoundConfig(round: number): RoundConfig
// Reads and parses data/challenges/round-{round}/config.json

function loadSystemPrompt(round: number): string
// Reads data/challenges/round-{round}/system-prompt.md

function loadToolFile(round: number, filename: string): string
// Reads data/challenges/round-{round}/{filename}.md
// Returns file content or throws if not found

function extractWelcomeMessage(systemPromptContent: string): string
// Extracts text between <!-- welcome --> markers from system-prompt.md
```

## Hint System

3 hints per round, 9 total. Each unlocks 6 minutes after the round starts. Hints escalate from subtle to obvious.

### Unlock Timing

```
Hint 1 → roundX_started_at + 6 min
Hint 2 → roundX_started_at + 12 min
Hint 3 → roundX_started_at + 18 min
```

### Hint Content

Hint text is authored in each round's `config.json` (see config.json Structure section). The spec does not duplicate it — `config.json` is the single source of truth.

### Hint UI

Collapsible panel below chat or in the scene visual area. 3 lock icons per round. Locked hints show countdown timer. Click to reveal (logged). Revealed hints persist on resume.

## Chat System

### Message Storage

```
april_chat_sessions — one per user per round
april_chat_messages — individual messages (role: user/assistant), kept forever
april_context_clears — timestamps of context resets per user per round
```

### Context Management

- **Clear context button** resets UI to AI welcome message only. Old messages kept in DB.
- On resume: load only messages after last `context_cleared_at` for both UI and AI payload.
- **Welcome message** is defined as the first paragraph/section in each round's `system-prompt.md` (marked with a `<!-- welcome -->` comment). It is always displayed as the first assistant message in chat and always included in the AI payload, even after context clear.
- AI payload construction:

```
system prompt (from system-prompt.md, injected at call time)
+ welcome message (from system-prompt.md, always present as first assistant message)
+ messages WHERE round = X AND timestamp > last context_clear
+ new user message
```

### Message Persistence Flow

```
User types message
  → Save user message to april_chat_messages (round, role="user")
  → Build API payload (system prompt + tools + post-clear messages + new message)
  → Stream response via SSE
  → On stream complete: save assistant message (role="assistant", tokens, response_time_ms)
  → Update april_chat_sessions (message_count, last_activity_at)
  → Log tool calls to april_tool_calls
```

## Game State & Persistence

### State Machine

Single `GameProvider` React context. One page, many states. No URL-based navigation (prevents skipping via URL manipulation).

### Persistence

- `april_game_state` table stores current phase + per-round timestamps
- Updated on every phase transition
- On login: fetch existing state → resume at current phase
- On resume: skip already-watched videos, restore chat (post-clear), restore hints

### State Transitions (Server-Enforced)

```
POST /api/game-state { action: "advance" }

Valid transitions:
  VIDEO_INTRO → ROUND_1       (video watched)
  ROUND_1 → VIDEO_1_2         (round1 answer verified)
  VIDEO_1_2 → ROUND_2         (video watched)
  ROUND_2 → VIDEO_2_3         (judge approved)
  VIDEO_2_3 → ROUND_3         (video watched)
  ROUND_3 → VIDEO_OUTRO       (round3 answer verified)
  VIDEO_OUTRO → SUCCESS        (video watched)
```

Server rejects invalid transitions. Client can only advance to the next phase.

## UI Layout & Visual Design

### Theme

Dark cyberpunk base with corporate thriller accents. Dark backgrounds (#0a0a0f), neon green accents (#00ff88), white text, subtle glows. Matches existing Prompt the Flag ad aesthetic.

### Login Screen

Dark, atmospheric. Citadel Plaza building silhouette. Input styled as keycard/access terminal: "Add meg a meghivokodod." Matrix-style background animation (carried over from March).

### Round Layout (Split View)

```
+----------------------------------------------+
|  HEADER BAR (timer, round 1/3, PTF logo)     |
+--------------------+-------------------------+
|                    | CHARACTER NAME & AVATAR  |
|                    |-------------------------|
|   SCENE VISUAL     |                         |
|   (placeholder     |   CHAT MESSAGES          |
|    for future      |                         |
|    artwork)        |                         |
|                    |-------------------------|
|                    |  INPUT + [Send]          |
|   ANSWER ENTRY     |  [Clear Context]         |
|   (R1: floor+door) |  [Try door] (R2 only)   |
|   (R3: private key)|                         |
|                    |  HINT PANEL (3 locks)    |
+--------------------+-------------------------+
```

### Scene Visuals

Placeholder divs per round, ready for background images/animations later:
- Round 1 — Lobby placeholder
- Round 2 — 69th floor corridor placeholder
- Round 3 — Executive office placeholder

### Mobile

Chat goes full-screen, scene visual becomes compact header banner. Answer entry slides up from bottom.

### Success Page ("Heist Report")

Reskinned March success page:
- Total infiltration time (sum of round times, excludes cutscenes)
- Per-round breakdown: time, messages sent, hints used, failed attempts
- Rounds completed indicator
- Certificate with username
- LinkedIn sharing

## Database Schema

### Tables

```sql
april_competition_users
  id                      UUID PK
  generated_password      TEXT UNIQUE
  username                TEXT nullable
  email                   TEXT nullable
  session_token           TEXT nullable
  first_login_at          TIMESTAMPTZ nullable
  solved_at               TIMESTAMPTZ nullable
  is_solved               BOOLEAN default false
  total_passcode_attempts INTEGER default 0
  total_chat_messages     INTEGER default 0
  total_hint_clicks       INTEGER default 0
  round1_time_ms          INTEGER nullable
  round2_time_ms          INTEGER nullable
  round3_time_ms          INTEGER nullable
  created_at              TIMESTAMPTZ default now()

april_game_state
  id                      UUID PK
  user_id                 UUID FK UNIQUE
  current_phase           TEXT
  round1_started_at       TIMESTAMPTZ nullable
  round1_completed_at     TIMESTAMPTZ nullable
  round1_answer           TEXT nullable
  round2_started_at       TIMESTAMPTZ nullable
  round2_completed_at     TIMESTAMPTZ nullable
  round3_started_at       TIMESTAMPTZ nullable
  round3_completed_at     TIMESTAMPTZ nullable
  round3_answer           TEXT nullable
  updated_at              TIMESTAMPTZ default now()

april_chat_sessions
  id                      UUID PK
  user_id                 UUID FK
  session_hash            TEXT
  round                   INTEGER
  user_ip                 TEXT nullable
  started_at              TIMESTAMPTZ default now()
  last_activity_at        TIMESTAMPTZ default now()
  message_count           INTEGER default 0
  completed               BOOLEAN default false
  completed_at            TIMESTAMPTZ nullable
  completion_time_seconds INTEGER nullable
  UNIQUE(session_hash, round)

april_chat_messages
  id                      UUID PK
  session_id              UUID FK ON DELETE CASCADE
  user_id                 UUID FK
  round                   INTEGER
  role                    TEXT
  content                 TEXT
  created_at              TIMESTAMPTZ default now()
  response_time_ms        INTEGER nullable
  prompt_tokens           INTEGER nullable
  completion_tokens       INTEGER nullable
  total_tokens            INTEGER nullable

april_context_clears
  id                      UUID PK
  user_id                 UUID FK
  round                   INTEGER
  cleared_at              TIMESTAMPTZ default now()

april_failed_attempts
  id                      UUID PK
  user_id                 UUID FK
  session_hash            TEXT
  round                   INTEGER
  attempted_answer        TEXT  -- truncated to 100 chars
  created_at              TIMESTAMPTZ default now()

april_hint_clicks
  id                      UUID PK
  user_id                 UUID FK
  session_hash            TEXT
  round                   INTEGER
  hint_number             INTEGER
  clicked_at              TIMESTAMPTZ default now()
  UNIQUE(user_id, round, hint_number)

april_user_session_links
  id                      UUID PK
  user_id                 UUID FK ON DELETE CASCADE
  session_hash            TEXT
  linked_at               TIMESTAMPTZ default now()
  UNIQUE(user_id, session_hash)

april_tool_calls
  id                      UUID PK
  session_id              UUID FK
  user_id                 UUID FK
  round                   INTEGER
  tool_name               TEXT
  called_at               TIMESTAMPTZ default now()

april_judge_attempts
  id                      UUID PK
  user_id                 UUID FK
  last_assistant_message  TEXT
  judge_result            BOOLEAN
  attempted_at            TIMESTAMPTZ default now()
```

### RPC Functions

```sql
april_increment_user_chat_messages(user_id UUID)
april_increment_user_passcode_attempts(user_id UUID)
april_increment_user_hint_clicks(user_id UUID)
```

### Security

- All tables: RLS enabled, service_role only
- Rate limiting: 5-second cooldown on answer submissions
- Rate limiting on chat: 3-second cooldown between `/api/chat` requests per user. Server returns 429 if violated.
- Round 2 judge: 1 attempt per assistant response (server-enforced via timestamp comparison)
- Attempted answers truncated to 100 chars
- Session tokens rotated on login

## API Routes

### Carried Over (Adapted)

| Route | Purpose | April Changes |
|-------|---------|---------------|
| `POST /api/login` | Password auth | Creates `april_game_state` row. On re-login: returns existing state for resume. |
| `POST /api/chat` | AI conversation | Adds `round` param. OpenAI tool calling. Logs tool calls. |
| `POST /api/verify-passcode` | Answer submission | Takes `round` + `answer`. Handles R1 (floor+door) and R3 (private key). |
| `POST /api/hint-click` | Hint reveal | Adds `round` + `hint_number`. Validates unlock time. |
| `GET /api/solve-metrics` | Success stats | Per-round breakdown. |
| `POST /api/set-username` | Certificate name | Unchanged. |
| `POST /api/subscribe-email` | Newsletter | Unchanged. |

### New Routes

| Route | Purpose |
|-------|---------|
| `GET/PATCH /api/game-state` | Fetch current phase for resume. Advance phase (server-validated transitions). |
| `POST /api/judge` | Round 2 door attempt. Judge LLM call. Returns yes/no. |
| `POST /api/context-clear` | Log context clear. Inserts into `april_context_clears`. |

## Middleware & Competition Timing

### Config

```typescript
COMPETITION_START = "2026-04-25T11:00:00Z"  // 13:00 CET
COMPETITION_LENGTH = 60
COMPETITION_END = "2026-04-25T12:00:00Z"
```

### Phases

| Phase | Behavior |
|-------|----------|
| Before | All routes → `/waiting` |
| During | `/login` public. All other routes require `competition_session` cookie. |
| After | Solvers → `/` (success). Non-solvers → `/closed`. No new logins. |

### Late Completion

Already-logged-in users can finish after `COMPETITION_END`. No new logins accepted.

## Frontend Components

```
components/
  game/
    game-provider.tsx        # Context: phase, round data, timing, dispatch
    game-shell.tsx           # Renders current phase component
    phase-video.tsx          # Full-screen video player, auto-advance, skip
    phase-round.tsx          # Split layout: scene + chat + answer
    phase-success.tsx        # Heist report + certificate

  chat/
    chat-interface.tsx       # Message list, SSE streaming
    chat-input.tsx           # Text input + send
    chat-message.tsx         # Message bubble
    clear-context-button.tsx # Reset to welcome message
    try-door-button.tsx      # Round 2 judge trigger

  round/
    answer-entry.tsx         # R1: single input for "floor+door" (e.g. "69+42A"). R3: private key string.
    hint-panel.tsx           # 3 locks with countdown/reveal
    scene-visual.tsx         # Placeholder for artwork
    round-header.tsx         # Character name, round indicator

  layout/
    header-bar.tsx           # Timer, round indicator, logo
    login-screen.tsx         # Citadel Plaza themed login

  ui/                        # Existing Radix UI wrappers (keep)

app/
  page.tsx                   # GameProvider + GameShell
  login/page.tsx             # Login
  waiting/page.tsx           # Pre-competition countdown
  closed/page.tsx            # Post-competition
  api/...                    # API routes
```

## What Gets Removed from March

- All e-commerce components (product-grid, product-card, cart, product pages)
- Cart context
- Products data (`lib/products.ts`)
- Shop-related routes (`/cart`, `/product/[id]`, `/contact`)
- Hero banner, webshop header/footer
- Challenge loader (`lib/challenge-loader.ts`) — replaced by `lib/round-loader.ts`

### What Gets Kept (Adapted)

- Login flow + middleware (retargeted to `april_` tables)
- SSE streaming chat infrastructure (extended with tool calling)
- Passcode verification logic (adapted for multi-round)
- Hint system (adapted for per-round timing)
- Success page structure (reskinned as "Heist Report")
- Supabase client/server helpers
- Radix UI component wrappers (`components/ui/`)
- Competition timing config pattern (`lib/config.ts`)
- Matrix background animation (login screen)

## Open Items

- Video assets: 4 MP4 files (`start.mp4`, `one.mp4`, `two.mp4`, `three.mp4`) to be placed in `/public/videos/`
- Scene visuals: placeholder divs ready for artwork/animation
- System prompt content: needs authoring for all 3 characters (including `<!-- welcome -->` markers)
- Knowledge base `.md` files: need realistic content authoring
- Private key value: needs to be decided
- Hint text: placeholders included, fine-tune after system prompts are written
- Round 2 judge prompt: fine-tune after Vanda's system prompt is written

# CLAUDE.md — PTF Verseny Május

## What This Is

A **prompt engineering competition platform** themed as a heist escape game ("Citadel Plaza"). Participants log in, navigate three locked rooms with three AI characters, extract secret codes through conversation, and escape. The competition is time-gated (60 minutes).

This repo was forked from the April edition (`ptf-verseny-aprilis`) and fully redesigned for the **May** competition.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling:** Tailwind CSS 4 + Radix UI components
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenAI API (gpt-4.1-mini), streamed via SSE
- **Package manager:** pnpm
- **Deployment:** Vercel
- **Language:** Hungarian (all UI text in `lib/translations.ts`)

## Commands

```bash
pnpm dev        # Dev server at localhost:3000
pnpm build      # Production build
pnpm start      # Start production server
pnpm lint       # ESLint
```

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `CRON_SECRET`
- `MAILERLITE_API_KEY`

## Project Structure

```
app/                    # Next.js App Router pages + API routes
  api/                  # Serverless endpoints (chat, login, verify-passcode, judge, game-state, etc.)
  login/                # Login page
  success/              # Post-solve page (heist report)
  waiting/              # Pre-competition countdown
  closed/               # Post-competition page
components/             # React components
  chat/                 # Chat UI components (chat-interface, avatars)
  passcode-entry.tsx    # Secret code submission form
  ui/                   # Radix UI wrappers (shadcn-style)
lib/                    # Utilities
  config.ts             # Competition timing constants (START, END, LENGTH, phases)
  challenge-loader.ts   # Loads round-specific challenge data
  chat-logger.ts        # Chat analytics logging
  translations.ts       # Hungarian UI strings
  supabase/             # Supabase client/server helpers
data/challenges/        # Challenge configs per round
  round-1/              # Adél (security system) — exact answer
  round-2/              # Vanda (receptionist) — AI-judged answer
  round-3/              # Copilot (desktop assistant) — exact answer
scripts/                # Admin scripts (user creation, backups, exports — march_/may_ historical migrations kept in place)
middleware.ts           # Auth + competition-phase routing
```

## Key Architecture

### Competition Flow
1. **Before competition:** All routes redirect to `/waiting` (countdown)
2. **During competition:** Login → progress through 3 rooms (rounds) with video interludes → each room has an AI character to extract a code from → submit code to advance
3. **After competition:** Solvers see `/success` (heist report), others see `/closed`

### Three Rounds
- **Round 1 — Adél:** Citadel Plaza AI security system. Exact answer required.
- **Round 2 — Vanda:** Mase Capital receptionist. Answer evaluated by AI judge (`/api/judge`).
- **Round 3 — Copilot:** Executive's desktop assistant. Exact answer required.

Each round has: system prompt (markdown), support documents, tool definitions, time-locked hints, and answer config.

### Authentication
- Login validates password against `may_competition_users` Supabase table
- Sets `competition_session` httpOnly cookie with UUID session token
- `middleware.ts` enforces auth on all protected routes

### Chat System
- Client sends messages to `/api/chat` with `session_hash`
- Server streams OpenAI responses via SSE
- Chat logged to `may_chat_sessions` + `may_chat_messages` tables
- System prompt loaded from round-specific challenge data

### Database Tables (prefixed `may_`)
- `may_competition_users` — participants, passwords, solve status
- `may_chat_sessions` / `may_chat_messages` — conversation logs
- `may_user_session_links` — user-session mapping
- `may_failed_attempts` — wrong passcode submissions (rate limiting)
- `may_game_state` — multi-round progression tracking
- `may_tool_calls` — AI tool usage logs
- `may_context_clears` — context clear events

## Important Notes

- **Competition date:** May 31, 2026, 15:00–16:00 CEST
- **Competition timing** is in `lib/config.ts` (UTC dates)
- Phases: VIDEO_INTRO → ROUND_1 → VIDEO_1_2 → ROUND_2 → VIDEO_2_3 → ROUND_3 → VIDEO_OUTRO → SUCCESS
- Rate limiting: 5-second cooldown between passcode attempts
- Hints are time-locked (revealed after X minutes into competition)
- Scripts in `scripts/` still reference `march_` table names (old competition data exports)

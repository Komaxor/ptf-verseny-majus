# CLAUDE.md — PTF Verseny Április

## What This Is

A **prompt engineering competition platform** disguised as a Hungarian RAM e-commerce store ("RAMtastic.hu"). Participants log in, chat with an AI assistant named **Ramóna** (GPT-4.1-mini), extract a hidden coupon code from the conversation, and submit it to win. The competition is time-gated (60 minutes).

This repo was forked from the March edition (`ptf-verseny-marcius`) and is being adapted for the **April** competition.

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
  api/                  # Serverless endpoints (chat, login, verify-passcode, etc.)
  login/                # Login page
  success/              # Post-solve page (metrics, certificate)
  waiting/              # Pre-competition countdown
  closed/               # Post-competition page
components/             # React components
  chat-interface.tsx    # Main chat UI with SSE streaming
  chat-widget.tsx       # Collapsible chat sidebar
  passcode-entry.tsx    # Secret code submission form
  product-grid.tsx      # Mock store product listing
  ui/                   # Radix UI wrappers (shadcn-style)
lib/                    # Utilities
  config.ts             # Competition timing constants (START, END, LENGTH)
  products.ts           # Mock RAM product data (8 items)
  challenge-loader.ts   # Loads challenge JSON
  chat-logger.ts        # Chat analytics logging
  cart-context.tsx      # Cart state (decorative, not competition-critical)
  translations.ts       # Hungarian UI strings
  supabase/             # Supabase client/server helpers
data/challenges/        # Challenge JSON (secret answer, system prompt, hints)
scripts/                # Admin scripts (user creation, backups, exports)
middleware.ts           # Auth + competition-phase routing
```

## Key Architecture

### Competition Flow
1. **Before competition:** All routes redirect to `/waiting` (countdown)
2. **During competition:** Login with unique password → chat with Ramóna → find coupon code → submit at passcode entry
3. **After competition:** Solvers see `/success` (metrics + certificate), others see `/closed`

### Authentication
- Login validates password against `march_competition_users` Supabase table
- Sets `competition_session` httpOnly cookie with UUID session token
- `middleware.ts` enforces auth on all protected routes

### Chat System
- Client sends messages to `/api/chat` with `session_hash`
- Server streams OpenAI responses via SSE
- Chat logged to `march_chat_sessions` + `march_chat_messages` tables
- System prompt defined in challenge JSON includes company context and hints

### Database Tables (prefixed `march_`)
- `march_competition_users` — participants, passwords, solve status
- `march_chat_sessions` / `march_chat_messages` — conversation logs
- `march_user_session_links` — user-session mapping
- `march_failed_attempts` — wrong passcode submissions (rate limiting)

### Challenge Data (`data/challenges/challenge-competition.json`)
- Current secret answer: `RAMFREE100`
- Difficulty: medium, estimated 15-30 min
- Contains knowledge base docs, company profiles, hint schedule

## Important Notes

- **All Supabase table names are prefixed with `march_`** — these need updating for April
- **Competition timing** is in `lib/config.ts` (UTC dates)
- The e-commerce store (products, cart) is purely decorative — the real challenge is the AI chat
- Rate limiting: 5-second cooldown between passcode attempts
- Hints are time-locked (revealed after X minutes into competition)
- Certificate generation happens on the success page with user's chosen name

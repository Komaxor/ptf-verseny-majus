# Graceful Competition End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When competition time expires, let active users finish but block new logins and don't count late finishes as solved. Show "LEZÁRULT" in the header when countdown reaches zero.

**Architecture:** Middleware gets a new "overtime" path for authenticated users after competition ends — they can keep using all APIs. The game-state API checks `COMPETITION_END` before setting `is_solved`. The header-bar replaces `00:00` with a red "LEZÁRULT" label.

**Tech Stack:** Next.js middleware, React client component, Supabase

---

### Task 1: Middleware — let authenticated users continue after competition ends

**Files:**
- Modify: `middleware.ts:44-83`

Currently the `"after"` block (line 44) only lets through a few post-competition APIs and redirects everyone else to `/closed` or `/success`. We need to add a path: if the user has a valid session, let them through to all protected routes (same as the "during" logic).

- [ ] **Step 1: Restructure the "after" block**

In `middleware.ts`, replace the current `competitionStatus === "after"` block (lines 44–83) with logic that:
1. Still allows post-competition APIs (`/api/closed-metrics`, `/api/solve-metrics`, `/api/subscribe-email`, `/api/set-username`) for everyone
2. For authenticated users with a valid session token who are **not yet solved** — let them through to all protected routes (same as "during" behavior, reusing the session validation at lines 117–168)
3. For solved users — redirect to `/success` (unchanged)
4. For unauthenticated users — redirect to `/closed` (unchanged)
5. Block `/login` page access after competition ends (redirect to `/closed`)
6. Block `/api/login` after competition ends (return 403)

```typescript
if (competitionStatus === "after") {
  // Allow post-competition APIs for everyone
  if (pathname === "/api/closed-metrics" || pathname === "/api/solve-metrics" || pathname === "/api/subscribe-email" || pathname === "/api/set-username") {
    return NextResponse.next()
  }

  // Block new logins
  if (pathname === "/api/login" || pathname === "/login") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "A verseny már véget ért." }, { status: 403 })
    }
    return NextResponse.redirect(new URL("/closed", request.url))
  }

  const sessionToken = request.cookies.get("competition_session")?.value
  if (sessionToken) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
        const { data: user } = await supabase
          .from("april_competition_users")
          .select("id, is_solved")
          .eq("session_token", sessionToken)
          .single()

        if (user?.is_solved) {
          // Already solved — go to success page
          if (pathname !== "/success") {
            return NextResponse.redirect(new URL("/success", request.url))
          }
          return NextResponse.next()
        }

        if (user) {
          // Valid session, not solved — let them continue (overtime)
          const requestHeaders = new Headers(request.headers)
          requestHeaders.set("x-user-id", user.id)
          requestHeaders.set("x-user-solved", "false")
          return NextResponse.next({ request: { headers: requestHeaders } })
        }
      } catch {
        // If validation fails, fall through to /closed
      }
    }
  }

  // No valid session — redirect to /closed
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "A verseny véget ért." }, { status: 403 })
  }
  if (pathname !== "/closed") {
    return NextResponse.redirect(new URL("/closed", request.url))
  }
  return NextResponse.next()
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: let authenticated users continue after competition ends"
```

---

### Task 2: Game state API — don't count late finishes as solved

**Files:**
- Modify: `app/api/game-state/route.ts:111-130`

When a user reaches the SUCCESS phase after `COMPETITION_END`, we should NOT set `is_solved: true`. The user still gets to see the success flow client-side (good UX), but their result won't count on the leaderboard.

- [ ] **Step 1: Add time check before setting is_solved**

In `app/api/game-state/route.ts`, import `COMPETITION_END` and wrap the `is_solved` update in a time check:

```typescript
import { VALID_TRANSITIONS, PHASE_ROUND, type Phase, COMPETITION_END } from "@/lib/config"
```

Then replace the SUCCESS block (lines 111–130) with:

```typescript
  // Mark solved when reaching SUCCESS — only if within competition time
  if (nextPhase === "SUCCESS") {
    const now = new Date()
    if (now <= COMPETITION_END) {
      await supabase
        .from("april_competition_users")
        .update({ is_solved: true, solved_at: now.toISOString() })
        .eq("id", user.id)
    }

    // Calculate per-round times regardless (for user's own stats)
    for (const r of [1, 2, 3]) {
      const started = gameState[`round${r}_started_at`]
      const completed = gameState[`round${r}_completed_at`]
      if (started && completed) {
        const timeMs = new Date(completed).getTime() - new Date(started).getTime()
        await supabase
          .from("april_competition_users")
          .update({ [`round${r}_time_ms`]: timeMs })
          .eq("id", user.id)
      }
    }
  }
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/api/game-state/route.ts
git commit -m "feat: don't count late finishes as solved"
```

---

### Task 3: Header bar — show "LEZÁRULT" when time is up

**Files:**
- Modify: `components/layout/header-bar.tsx:56-64`

When `remaining === 0`, display "LEZÁRULT" in red instead of the `00:00` timer.

- [ ] **Step 1: Update the timer display**

Replace the timer div (lines 56–64) with:

```tsx
      <div
        className={`flex items-center gap-2 text-sm font-mono ${
          remaining === 0
            ? "text-red-500 font-bold"
            : minutes < 1
            ? "text-red-500"
            : minutes < 5
            ? "text-yellow-400"
            : "text-white/60"
        }`}
        title="Hátralévő idő"
      >
        <Timer className="w-4 h-4" />
        {remaining === 0
          ? "LEZÁRULT"
          : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`}
      </div>
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/layout/header-bar.tsx
git commit -m "feat: show LEZÁRULT in header when competition time expires"
```

---

## Summary of changes

| File | Change |
|------|--------|
| `middleware.ts` | Authenticated unsolved users can continue using all APIs after competition ends; new logins blocked |
| `app/api/game-state/route.ts` | `is_solved` only set if `now <= COMPETITION_END` |
| `components/layout/header-bar.tsx` | Timer shows "LEZÁRULT" in red when countdown reaches 0 |
| `app/api/login/route.ts` | No change needed — already blocks after `COMPETITION_END` |

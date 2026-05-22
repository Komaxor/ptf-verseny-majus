import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { COMPETITION_END } from "@/lib/config"

export async function GET(_request: NextRequest) {
  try {
    // Auth
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("competition_session")?.value
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServiceClient()

    const { data: user, error: userError } = await supabase
      .from("may_competition_users")
      .select("id")
      .eq("session_token", sessionToken)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch game state for timing
    const { data: gameState } = await supabase
      .from("may_game_state")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (!gameState) {
      return NextResponse.json({ error: "No game state" }, { status: 404 })
    }

    // Per-round timing
    const rounds = [1, 2, 3].map((r) => {
      const started = gameState[`round${r}_started_at`]
      const completed = gameState[`round${r}_completed_at`]
      const timeMs = started && completed
        ? new Date(completed).getTime() - new Date(started).getTime()
        : null
      return { round: r, timeMs }
    })

    // Message counts per round — count user messages directly from
    // may_chat_messages. We can't sum may_chat_sessions.message_count because
    // session rows are keyed by (session_hash, round) globally: if a
    // session_hash is reused across logins, the session row stays owned by its
    // original creator while a later user's messages still carry that user's
    // own user_id here. may_chat_messages is the only per-user-accurate source.
    const { data: userMessages } = await supabase
      .from("may_chat_messages")
      .select("round")
      .eq("user_id", user.id)
      .eq("role", "user")

    // Failed attempts per round
    const { data: failed } = await supabase
      .from("may_failed_attempts")
      .select("round")
      .eq("user_id", user.id)

    // Hint clicks per round
    const { data: hints } = await supabase
      .from("may_hint_clicks")
      .select("round")
      .eq("user_id", user.id)

    // Tool calls per round
    const { data: tools } = await supabase
      .from("may_tool_calls")
      .select("round")
      .eq("user_id", user.id)

    const totalTimeMs = rounds.reduce((sum, r) => sum + (r.timeMs || 0), 0)
    const totalMessages = userMessages?.length || 0
    const totalHints = hints?.length || 0
    const totalFailedAttempts = failed?.length || 0

    return NextResponse.json({
      totalTimeSeconds: Math.round(totalTimeMs / 1000),
      totalMessages,
      totalHints,
      totalFailedAttempts,
      rounds: rounds.map((r) => ({
        round: r.round,
        timeSeconds: r.timeMs ? Math.round(r.timeMs / 1000) : 0,
        messageCount: userMessages?.filter((m) => m.round === r.round).length || 0,
        hintClicks: hints?.filter((h) => h.round === r.round).length || 0,
        failedAttempts: failed?.filter((f) => f.round === r.round).length || 0,
      })),
      solvedAt: gameState.round3_completed_at,
      isLateSolve: gameState.round3_completed_at
        ? new Date(gameState.round3_completed_at) > COMPETITION_END
        : false,
    })
  } catch (error) {
    console.error("Solve metrics error:", error)
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
  }
}

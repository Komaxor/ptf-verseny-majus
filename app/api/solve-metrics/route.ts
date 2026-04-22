import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

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
      .from("april_competition_users")
      .select("id")
      .eq("session_token", sessionToken)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch game state for timing
    const { data: gameState } = await supabase
      .from("april_game_state")
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

    // Message counts per round
    const { data: sessions } = await supabase
      .from("april_chat_sessions")
      .select("round, message_count")
      .eq("user_id", user.id)

    // Failed attempts per round
    const { data: failed } = await supabase
      .from("april_failed_attempts")
      .select("round")
      .eq("user_id", user.id)

    // Hint clicks per round
    const { data: hints } = await supabase
      .from("april_hint_clicks")
      .select("round")
      .eq("user_id", user.id)

    // Tool calls per round
    const { data: tools } = await supabase
      .from("april_tool_calls")
      .select("round")
      .eq("user_id", user.id)

    return NextResponse.json({
      totalTimeMs: rounds.reduce((sum, r) => sum + (r.timeMs || 0), 0),
      rounds: rounds.map((r) => ({
        round: r.round,
        timeMs: r.timeMs,
        messages: sessions?.filter((s) => s.round === r.round).reduce((sum, s) => sum + s.message_count, 0) || 0,
        failedAttempts: failed?.filter((f) => f.round === r.round).length || 0,
        hintClicks: hints?.filter((h) => h.round === r.round).length || 0,
        toolCalls: tools?.filter((t) => t.round === r.round).length || 0,
      })),
      solvedAt: gameState.round3_completed_at,
    })
  } catch (error) {
    console.error("Solve metrics error:", error)
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
  }
}

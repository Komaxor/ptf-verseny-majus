import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const competitionSession = cookieStore.get("competition_session")?.value
    if (!competitionSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServiceClient()

    // Get user from session token
    const { data: user, error: userError } = await supabase
      .from("april_competition_users")
      .select("id, is_solved, solved_at, total_chat_messages, total_passcode_attempts, total_hint_clicks")
      .eq("session_token", competitionSession)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get game state for round timing
    const { data: gameState } = await supabase
      .from("april_game_state")
      .select("round1_started_at, round1_completed_at, round2_started_at, round2_completed_at, round3_started_at, round3_completed_at")
      .eq("user_id", user.id)
      .single()

    // Calculate total completion time from game state
    let completionTimeSeconds = 0
    if (gameState) {
      const roundTimes = [
        { start: gameState.round1_started_at, end: gameState.round1_completed_at },
        { start: gameState.round2_started_at, end: gameState.round2_completed_at },
        { start: gameState.round3_started_at, end: gameState.round3_completed_at },
      ]
      for (const rt of roundTimes) {
        if (rt.start && rt.end) {
          completionTimeSeconds += Math.round((new Date(rt.end).getTime() - new Date(rt.start).getTime()) / 1000)
        }
      }
    }

    // Get total tokens from chat messages
    const { data: tokenData } = await supabase
      .from("april_chat_messages")
      .select("total_tokens")
      .eq("user_id", user.id)

    const totalTokens = tokenData?.reduce((sum, m) => sum + (m.total_tokens || 0), 0) || 0

    return NextResponse.json({
      isSolved: user.is_solved || false,
      completionTimeSeconds,
      messageCount: user.total_chat_messages || 0,
      failedAttempts: user.total_passcode_attempts || 0,
      hintClicks: user.total_hint_clicks || 0,
      totalTokens,
    })
  } catch (error) {
    console.error("Closed metrics error:", error)
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
  }
}

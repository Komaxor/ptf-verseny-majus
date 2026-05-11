import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { loadRoundConfig } from "@/lib/round-loader"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { round, hintNumber, sessionHash } = await request.json()

    if (!round || round < 1 || round > 3) {
      return NextResponse.json({ success: false, error: "Invalid round" }, { status: 400 })
    }

    if (!hintNumber || typeof hintNumber !== "number") {
      return NextResponse.json({ success: false, error: "Hint number is required" }, { status: 400 })
    }

    if (!sessionHash || typeof sessionHash !== "string") {
      return NextResponse.json({ success: false, error: "Session hash is required" }, { status: 400 })
    }

    // Auth
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("competition_session")?.value
    if (!sessionToken) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServiceClient()

    const { data: user, error: userError } = await supabase
      .from("may_competition_users")
      .select("id")
      .eq("session_token", sessionToken)
      .single()

    if (userError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Validate that the round has started and hint is unlocked
    const { data: gameState } = await supabase
      .from("may_game_state")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (!gameState) {
      return NextResponse.json({ success: false, error: "No game state" }, { status: 400 })
    }

    const roundStarted = gameState[`round${round}_started_at`]
    if (!roundStarted) {
      return NextResponse.json({ success: false, error: "Round not started" }, { status: 400 })
    }

    // Load round config to validate hint timing
    const config = loadRoundConfig(round)
    const hint = config.hints.find((h) => h.number === hintNumber)
    if (!hint) {
      return NextResponse.json({ success: false, error: "Invalid hint" }, { status: 400 })
    }

    const unlockTime = new Date(roundStarted).getTime() + hint.unlock_after_minutes * 60 * 1000
    if (Date.now() < unlockTime) {
      return NextResponse.json({ success: false, error: "Hint not yet unlocked" }, { status: 400 })
    }

    // Upsert hint click (unique constraint prevents duplicate tracking)
    await supabase
      .from("may_hint_clicks")
      .upsert(
        {
          user_id: user.id,
          session_hash: sessionHash,
          round,
          hint_number: hintNumber,
        },
        { onConflict: "user_id,round,hint_number" }
      )

    // Increment hint clicks for competition tracking
    await supabase.rpc("may_increment_user_hint_clicks", { p_user_id: user.id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Hint click error:", error)
    return NextResponse.json({ success: false, error: "Failed to log hint click" }, { status: 500 })
  }
}

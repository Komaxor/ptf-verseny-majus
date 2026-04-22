import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServiceClient } from "@/lib/supabase/server"
import { VALID_TRANSITIONS, PHASE_ROUND, type Phase } from "@/lib/config"
import type { ChatMessage } from "@/lib/types"
import { getMessagesAfterLastClear } from "@/lib/chat-logger"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAuthenticatedUser(supabase: any) {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("competition_session")?.value
  if (!sessionToken) return null

  const { data } = await supabase
    .from("april_competition_users")
    .select("id, is_solved")
    .eq("session_token", sessionToken)
    .single()

  return data
}

// GET - fetch current game state + chat messages for current round
export async function GET() {
  const supabase = await createServiceClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: gameState } = await supabase
    .from("april_game_state")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!gameState) {
    return NextResponse.json({ error: "No game state" }, { status: 404 })
  }

  // Load chat messages for current round (if in a round phase)
  const round = PHASE_ROUND[gameState.current_phase as Phase]
  let chatMessages: ChatMessage[] = []
  if (round) {
    chatMessages = await getMessagesAfterLastClear(user.id, round)
  }

  // Load revealed hints
  const { data: revealedHints } = await supabase
    .from("april_hint_clicks")
    .select("round, hint_number")
    .eq("user_id", user.id)

  return NextResponse.json({
    gameState,
    chatMessages: chatMessages || [],
    revealedHints: revealedHints || [],
  })
}

// PATCH - advance to next phase
export async function PATCH(_request: NextRequest) {
  const supabase = await createServiceClient()
  const user = await getAuthenticatedUser(supabase)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: gameState } = await supabase
    .from("april_game_state")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!gameState) {
    return NextResponse.json({ error: "No game state" }, { status: 404 })
  }

  const currentPhase = gameState.current_phase as Phase
  const nextPhase = VALID_TRANSITIONS[currentPhase]

  if (!nextPhase) {
    return NextResponse.json({ error: "No valid transition" }, { status: 400 })
  }

  // Verify round completion before allowing round→video transitions
  const currentRound = PHASE_ROUND[currentPhase];
  if (currentRound) {
    const completedField = `round${currentRound}_completed_at`;
    if (!gameState[completedField]) {
      return NextResponse.json({ error: "Round not completed" }, { status: 400 });
    }
  }

  // Build update payload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {
    current_phase: nextPhase,
    updated_at: new Date().toISOString(),
  }

  // Set round started_at when entering a round
  const nextRound = PHASE_ROUND[nextPhase]
  if (nextRound) {
    const startedField = `round${nextRound}_started_at`
    if (!gameState[startedField]) {
      update[startedField] = new Date().toISOString()
    }
  }

  // Mark solved when reaching SUCCESS
  if (nextPhase === "SUCCESS") {
    await supabase
      .from("april_competition_users")
      .update({ is_solved: true, solved_at: new Date().toISOString() })
      .eq("id", user.id)

    // Calculate per-round times
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

  const { data: updatedState, error } = await supabase
    .from("april_game_state")
    .update(update)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }

  return NextResponse.json({ success: true, gameState: updatedState })
}

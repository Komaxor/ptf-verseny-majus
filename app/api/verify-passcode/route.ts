import { type NextRequest, NextResponse } from "next/server"
import { verifyAnswer } from "@/lib/round-loader"
import { markRoundComplete } from "@/lib/chat-logger"
import { createServiceClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { ANSWER_COOLDOWN_MS } from "@/lib/config"

const MAX_ANSWER_LENGTH = 100

// Get authenticated user from session cookie
async function getAuthenticatedUser(sessionToken: string | undefined) {
  if (!sessionToken) return null

  try {
    const supabase = await createServiceClient()
    const { data: user, error } = await supabase
      .from("april_competition_users")
      .select("id, is_solved, total_passcode_attempts")
      .eq("session_token", sessionToken)
      .single()

    if (error || !user) return null
    return user
  } catch {
    return null
  }
}

async function checkRateLimit(userId: string, round: number): Promise<{ allowed: boolean; waitTime: number }> {
  try {
    const supabase = await createServiceClient()
    const cutoffTime = new Date(Date.now() - ANSWER_COOLDOWN_MS).toISOString()

    const { data } = await supabase
      .from("april_failed_attempts")
      .select("created_at")
      .eq("user_id", userId)
      .eq("round", round)
      .gte("created_at", cutoffTime)
      .order("created_at", { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastAttempt = new Date(data[0].created_at).getTime()
      const timeSince = (Date.now() - lastAttempt) / 1000
      const waitTime = Math.ceil(ANSWER_COOLDOWN_MS / 1000 - timeSince)
      return { allowed: false, waitTime: Math.max(0, waitTime) }
    }

    return { allowed: true, waitTime: 0 }
  } catch {
    return { allowed: true, waitTime: 0 }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { answer, round, sessionHash } = await request.json()

    // Get authenticated user from competition session
    const cookieStore = await cookies()
    const competitionSession = cookieStore.get("competition_session")?.value
    const user = await getAuthenticatedUser(competitionSession)

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (!answer || typeof answer !== "string") {
      return NextResponse.json({ success: false, error: "A válasz megadása kötelező" }, { status: 400 })
    }

    if (!round || round < 1 || round > 3) {
      return NextResponse.json({ success: false, error: "Érvénytelen kör" }, { status: 400 })
    }

    const normalizedAnswer = answer.trim()

    if (normalizedAnswer.length > MAX_ANSWER_LENGTH) {
      return NextResponse.json(
        { success: false, error: `A válasz maximum ${MAX_ANSWER_LENGTH} karakter lehet` },
        { status: 400 },
      )
    }

    // Rate limit: 5-second cooldown per round
    const { allowed, waitTime } = await checkRateLimit(user.id, round)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: `Kérlek várj ${waitTime} másodpercet a következő próbálkozás előtt`, rateLimited: true, waitTime },
        { status: 429 },
      )
    }

    // Increment user's passcode attempts
    const supabase = await createServiceClient()
    await supabase.rpc("april_increment_user_passcode_attempts", { p_user_id: user.id })

    // Verify the answer
    const isCorrect = verifyAnswer(round, normalizedAnswer)

    if (isCorrect) {
      // Update game state with completion
      const completedField = `round${round}_completed_at`
      const answerField = `round${round}_answer`
      await supabase
        .from("april_game_state")
        .update({
          [completedField]: new Date().toISOString(),
          [answerField]: normalizedAnswer.substring(0, 100),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)

      // Mark the chat session as complete for this round
      if (sessionHash) {
        await markRoundComplete(user.id, round, sessionHash)
      }

      return NextResponse.json({ success: true })
    } else {
      // Log failed attempt
      await supabase.from("april_failed_attempts").insert({
        user_id: user.id,
        session_hash: sessionHash || "unknown",
        round,
        attempted_answer: normalizedAnswer.substring(0, 100),
      })

      return NextResponse.json({ success: false, error: "Hibás válasz" })
    }
  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json({ success: false, error: "Ellenőrzés sikertelen" }, { status: 500 })
  }
}

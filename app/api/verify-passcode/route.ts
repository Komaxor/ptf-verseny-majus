import { type NextRequest, NextResponse } from "next/server"
import { getCurrentChallenge, verifyAnswer } from "@/lib/challenge-loader"
import { markSessionComplete } from "@/lib/chat-logger"
import { createServiceClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { COMPETITION_END } from "@/lib/config"

const SECRET_LENGTH = 30
const RATE_LIMIT_SECONDS = 5

// Hash function for session tokens
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// Get authenticated user from session cookie
async function getAuthenticatedUser(sessionToken: string | undefined) {
  if (!sessionToken) return null

  try {
    const supabase = await createServiceClient()
    const { data: user, error } = await supabase
      .from("march_competition_users")
      .select("id, is_solved, total_passcode_attempts, generated_password")
      .eq("session_token", sessionToken)
      .single()

    if (error || !user) return null
    return user
  } catch {
    return null
  }
}

// Increment user's passcode attempts
async function incrementUserAttempts(userId: string): Promise<void> {
  try {
    const supabase = await createServiceClient()
    await supabase.rpc("march_increment_user_passcode_attempts", { user_id: userId })
  } catch (error) {
    console.error("Failed to increment user attempts:", error)
  }
}

// Mark user as solved
async function markUserSolved(userId: string): Promise<void> {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase
      .from("march_competition_users")
      .update({
        is_solved: true,
        solved_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .eq("is_solved", false)

    if (error) {
      console.error("Failed to mark user solved:", error)
    }
  } catch (error) {
    console.error("Failed to mark user solved:", error)
  }
}

async function checkRateLimit(sessionHash: string): Promise<{ allowed: boolean; waitTime: number }> {
  try {
    const supabase = await createServiceClient()
    const cutoffTime = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString()

    const { data } = await supabase
      .from("march_failed_attempts")
      .select("created_at")
      .eq("session_hash", sessionHash)
      .gte("created_at", cutoffTime)
      .order("created_at", { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastAttempt = new Date(data[0].created_at).getTime()
      const timeSince = (Date.now() - lastAttempt) / 1000
      const waitTime = Math.ceil(RATE_LIMIT_SECONDS - timeSince)
      return { allowed: false, waitTime: Math.max(0, waitTime) }
    }

    return { allowed: true, waitTime: 0 }
  } catch {
    return { allowed: true, waitTime: 0 }
  }
}

async function logFailedAttempt(sessionHash: string, challengeId: string, attemptedSecret: string): Promise<void> {
  try {
    const supabase = await createServiceClient()
    await supabase.from("march_failed_attempts").insert({
      session_hash: sessionHash,
      challenge_id: challengeId,
      attempted_secret: attemptedSecret.substring(0, 100), // Truncate for safety
    })
  } catch (error) {
    console.error("Failed to log attempt:", error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if competition has ended
    if (new Date() > COMPETITION_END) {
      return NextResponse.json(
        { success: false, error: "A verseny már véget ért." },
        { status: 403 }
      )
    }

    const { passcode, sessionHash: clientSessionHash } = await request.json()

    // Get authenticated user from competition session
    const cookieStore = await cookies()
    const competitionSession = cookieStore.get("competition_session")?.value
    const user = await getAuthenticatedUser(competitionSession)

    if (!passcode || typeof passcode !== "string") {
      return NextResponse.json({ success: false, error: "A kód megadása kötelező" }, { status: 400 })
    }

    const normalizedPasscode = passcode.trim().toLowerCase()

    if (normalizedPasscode.length > SECRET_LENGTH) {
      return NextResponse.json(
        { success: false, error: `A kód maximum ${SECRET_LENGTH} karakter lehet` },
        { status: 400 },
      )
    }

    if (clientSessionHash) {
      const { allowed, waitTime } = await checkRateLimit(clientSessionHash)
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: `Kérlek várj ${waitTime} másodpercet a következő próbálkozás előtt`, rateLimited: true, waitTime },
          { status: 429 },
        )
      }
    }

    // Load current challenge and verify
    const challenge = await getCurrentChallenge()
    const isValid = verifyAnswer(challenge, normalizedPasscode)

    // Always increment user attempts (for competition tracking)
    if (user) {
      await incrementUserAttempts(user.id)
    }

    if (!isValid) {
      if (clientSessionHash) {
        await logFailedAttempt(clientSessionHash, challenge.id, normalizedPasscode)
      }
      return NextResponse.json({ success: false, error: "Hibás kód" })
    }

    // Check if user already solved (prevent double submission)
    if (user?.is_solved) {
      return NextResponse.json({
        success: true,
        challengeId: challenge.id,
        alreadySolved: true,
      })
    }

    // Generate server-side verification token
    let sessionToken = cookieStore.get("session_token")?.value

    if (!sessionToken) {
      sessionToken = crypto.randomUUID()
      cookieStore.set("session_token", sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 24,
      })
    }

    if (clientSessionHash) {
      await markSessionComplete(clientSessionHash, challenge.id, user?.generated_password ?? null)
    }

    // Mark competition user as solved and link session
    if (user) {
      await markUserSolved(user.id)
      if (clientSessionHash) {
        const supabase = await createServiceClient()
        await supabase
          .from("march_user_session_links")
          .upsert({ user_id: user.id, session_hash: clientSessionHash }, { onConflict: "user_id,session_hash" })
      }
    }

    return NextResponse.json({
      success: true,
      challengeId: challenge.id,
    })
  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json({ success: false, error: "Ellenőrzés sikertelen" }, { status: 500 })
  }
}

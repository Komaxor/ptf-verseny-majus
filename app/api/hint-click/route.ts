import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getCurrentChallenge } from "@/lib/challenge-loader"
import { cookies } from "next/headers"

// Get authenticated competition user and increment hint clicks
async function trackCompetitionUserHint(): Promise<void> {
  try {
    const cookieStore = await cookies()
    const competitionSession = cookieStore.get("competition_session")?.value
    
    if (!competitionSession) return

    const supabase = await createServiceClient()
    const { data: user, error } = await supabase
      .from("march_competition_users")
      .select("id")
      .eq("session_token", competitionSession)
      .single()

    if (error || !user) return

    // Increment hint clicks for competition tracking
    await supabase.rpc("march_increment_user_hint_clicks", { user_id: user.id })
  } catch {
    // Silent fail - not critical
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionHash } = await request.json()

    if (!sessionHash || typeof sessionHash !== "string") {
      return NextResponse.json({ success: false, error: "Session hash is required" }, { status: 400 })
    }

    const challenge = await getCurrentChallenge()
    const supabase = await createServiceClient()

    await supabase.from("march_hint_clicks").insert({
      session_hash: sessionHash,
      challenge_id: challenge.id,
    })

    // Track for competition user (non-blocking)
    await trackCompetitionUserHint()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Hint click error:", error)
    return NextResponse.json({ success: false, error: "Failed to log hint click" }, { status: 500 })
  }
}

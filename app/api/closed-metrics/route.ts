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
      .from("march_competition_users")
      .select("id, is_solved, solved_at")
      .eq("session_token", competitionSession)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get all session hashes linked to this user
    const { data: links } = await supabase
      .from("march_user_session_links")
      .select("session_hash")
      .eq("user_id", user.id)

    const sessionHashes = links?.map((l) => l.session_hash) || []

    if (sessionHashes.length === 0) {
      return NextResponse.json({
        isSolved: user.is_solved || false,
        completionTimeSeconds: 0,
        messageCount: 0,
        failedAttempts: 0,
        hintClicks: 0,
        totalTokens: 0,
      })
    }

    // Get chat session stats
    const { data: sessions } = await supabase
      .from("march_chat_sessions")
      .select("message_count, completion_time_seconds")
      .in("session_hash", sessionHashes)

    const messageCount = sessions?.reduce((sum, s) => sum + (s.message_count || 0), 0) || 0
    const completionTimeSeconds = sessions?.reduce((max, s) => Math.max(max, s.completion_time_seconds || 0), 0) || 0

    // Get session IDs for token query
    const { data: sessionRows } = await supabase
      .from("march_chat_sessions")
      .select("id")
      .in("session_hash", sessionHashes)

    const sessionIds = sessionRows?.map((s) => s.id) || []

    // Get total tokens
    let totalTokens = 0
    if (sessionIds.length > 0) {
      const { data: tokenData } = await supabase
        .from("march_chat_messages")
        .select("total_tokens")
        .in("session_id", sessionIds)

      totalTokens = tokenData?.reduce((sum, m) => sum + (m.total_tokens || 0), 0) || 0
    }

    // Get failed attempts count
    const { count: failedAttempts } = await supabase
      .from("march_failed_attempts")
      .select("*", { count: "exact", head: true })
      .in("session_hash", sessionHashes)

    // Get hint clicks count
    const { count: hintClicks } = await supabase
      .from("march_hint_clicks")
      .select("*", { count: "exact", head: true })
      .in("session_hash", sessionHashes)

    return NextResponse.json({
      isSolved: user.is_solved || false,
      completionTimeSeconds,
      messageCount,
      failedAttempts: failedAttempts || 0,
      hintClicks: hintClicks || 0,
      totalTokens,
    })
  } catch (error) {
    console.error("Closed metrics error:", error)
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
  }
}

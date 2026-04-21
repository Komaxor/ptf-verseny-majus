import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const sessionHash = request.nextUrl.searchParams.get("sessionHash")
    if (!sessionHash) {
      return NextResponse.json({ error: "Missing sessionHash" }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Get chat session data (first message time, message count, completion)
    const { data: session } = await supabase
      .from("march_chat_sessions")
      .select("started_at, completed_at, message_count, completion_time_seconds")
      .eq("session_hash", sessionHash)
      .limit(1)
      .single()

    // Get failed attempts count
    const { count: failedAttempts } = await supabase
      .from("march_failed_attempts")
      .select("*", { count: "exact", head: true })
      .eq("session_hash", sessionHash)

    // Get hint clicks count
    const { count: hintClicks } = await supabase
      .from("march_hint_clicks")
      .select("*", { count: "exact", head: true })
      .eq("session_hash", sessionHash)

    return NextResponse.json({
      firstMessageAt: session?.started_at || null,
      solvedAt: session?.completed_at || null,
      messageCount: session?.message_count || 0,
      completionTimeSeconds: session?.completion_time_seconds || 0,
      failedAttempts: failedAttempts || 0,
      hintClicks: hintClicks || 0,
    })
  } catch (error) {
    console.error("Solve metrics error:", error)
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
  }
}

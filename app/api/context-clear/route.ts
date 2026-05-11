import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient()

    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("competition_session")?.value
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: user } = await supabase
      .from("may_competition_users")
      .select("id")
      .eq("session_token", sessionToken)
      .single()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { round } = await request.json()
    if (!round || round < 1 || round > 3) {
      return NextResponse.json({ error: "Invalid round" }, { status: 400 })
    }

    await supabase.from("may_context_clears").insert({
      user_id: user.id,
      round,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[context-clear] Unexpected error:", error)
    return NextResponse.json({ error: "Failed to clear context" }, { status: 500 })
  }
}

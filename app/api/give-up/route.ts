import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { COMPETITION_END } from "@/lib/config"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST() {
  if (new Date() < COMPETITION_END) {
    return NextResponse.json({ error: "A verseny még tart." }, { status: 403 })
  }

  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("competition_session")?.value

  if (!sessionToken) {
    return NextResponse.json({ error: "No session" }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const { data: user } = await supabase
    .from("april_competition_users")
    .select("id, is_solved, gave_up_at")
    .eq("session_token", sessionToken)
    .single()

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (user.is_solved) {
    return NextResponse.json({ error: "Már megoldottad a versenyt." }, { status: 400 })
  }

  // Idempotent: already gave up → return success without overwriting timestamp
  if (user.gave_up_at) {
    return NextResponse.json({ ok: true })
  }

  // Flag as gave up — session_token stays intact for retrospective analysis
  const { error: updateError } = await supabase
    .from("april_competition_users")
    .update({ gave_up_at: new Date().toISOString() })
    .eq("id", user.id)

  if (updateError) {
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

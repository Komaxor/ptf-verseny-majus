import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

const MAX_USERNAME_LENGTH = 50

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username || typeof username !== "string" || !username.trim()) {
      return NextResponse.json(
        { success: false, error: "Felhasználónév megadása kötelező." },
        { status: 400 }
      )
    }

    const trimmed = username.trim()

    if (trimmed.length > MAX_USERNAME_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_USERNAME_LENGTH} karakter.` },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("competition_session")?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Nincs bejelentkezve." },
        { status: 401 }
      )
    }

    const supabase = await createServiceClient()

    const { data: user, error: findError } = await supabase
      .from("march_competition_users")
      .select("id, is_solved")
      .eq("session_token", sessionToken)
      .single()

    if (findError || !user) {
      return NextResponse.json(
        { success: false, error: "Érvénytelen munkamenet." },
        { status: 401 }
      )
    }

    if (!user.is_solved) {
      return NextResponse.json(
        { success: false, error: "Csak megoldók állíthatnak be felhasználónevet." },
        { status: 403 }
      )
    }

    const { error: updateError } = await supabase
      .from("march_competition_users")
      .update({ username: trimmed })
      .eq("id", user.id)

    if (updateError) {
      console.error("[set-username] Update failed:", updateError)
      return NextResponse.json(
        { success: false, error: "Mentés sikertelen. Próbáld újra." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[set-username] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "Hiba történt. Próbáld újra." },
      { status: 500 }
    )
  }
}

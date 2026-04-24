import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { COMPETITION_END } from "@/lib/config"

export async function POST() {
  if (new Date() < COMPETITION_END) {
    return NextResponse.json({ error: "A verseny még tart." }, { status: 403 })
  }

  const cookieStore = await cookies()
  cookieStore.delete("competition_session")

  return NextResponse.json({ ok: true })
}

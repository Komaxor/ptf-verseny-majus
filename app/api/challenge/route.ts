import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { loadRoundConfig, loadSystemPrompt, extractWelcomeMessage } from "@/lib/round-loader"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roundParam = searchParams.get("round")

    if (!roundParam) {
      return NextResponse.json({ error: "Missing ?round=N parameter" }, { status: 400 })
    }

    const round = parseInt(roundParam, 10)
    if (isNaN(round) || round < 1 || round > 3) {
      return NextResponse.json({ error: "Round must be 1, 2, or 3" }, { status: 400 })
    }

    const config = loadRoundConfig(round)
    const systemPrompt = loadSystemPrompt(round)
    const welcomeMessage = extractWelcomeMessage(systemPrompt)

    // Return round config for the client — do NOT return the expected answer
    return NextResponse.json({
      round: config.round,
      character: config.character,
      hints: config.hints,
      answerType: config.answer.type,
      welcomeMessage,
    })
  } catch (error) {
    console.error("Error loading round config:", error)
    return NextResponse.json({ error: "Failed to load round config" }, { status: 500 })
  }
}

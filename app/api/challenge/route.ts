import { NextResponse } from "next/server"
import { getCurrentChallenge, getChallengeMetadataForClient } from "@/lib/challenge-loader"

export async function GET() {
  try {
    const challenge = await getCurrentChallenge()
    const metadata = getChallengeMetadataForClient(challenge)

    return NextResponse.json(metadata)
  } catch (error) {
    console.error("Error loading challenge metadata:", error)
    return NextResponse.json({ error: "Failed to load challenge" }, { status: 500 })
  }
}

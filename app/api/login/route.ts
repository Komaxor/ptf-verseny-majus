import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { COMPETITION_START, COMPETITION_END } from "@/lib/config"

// Rate limiting: 10 requests per IP per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 10
const rateLimitMap = new Map<string, { timestamps: number[] }>()

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS)
    if (entry.timestamps.length === 0) rateLimitMap.delete(ip)
  }
}, 5 * 60 * 1000)

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip) ?? { timestamps: [] }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS)

  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    const oldestInWindow = entry.timestamps[0]
    const retryAfterSeconds = Math.ceil((oldestInWindow + RATE_LIMIT_WINDOW_MS - now) / 1000)
    return { allowed: false, remaining: 0, retryAfterSeconds }
  }

  entry.timestamps.push(now)
  rateLimitMap.set(ip, entry)
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.timestamps.length, retryAfterSeconds: 0 }
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  )
}

export async function POST(request: NextRequest) {
  try {
    // Check if within competition window
    const now = new Date()
    if (now < COMPETITION_START) {
      return NextResponse.json(
        { success: false, error: "A verseny még nem kezdődött el." },
        { status: 403 }
      )
    }
    if (now > COMPETITION_END) {
      return NextResponse.json(
        { success: false, error: "A verseny már véget ért." },
        { status: 403 }
      )
    }

    // Rate limit by IP
    const ip = getClientIp(request)
    const rateLimit = checkRateLimit(ip)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: `Túl sok próbálkozás. Kérlek várj ${rateLimit.retryAfterSeconds} másodpercet.` },
        { status: 429 }
      )
    }

    const { password } = await request.json()

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Jelszó megadása kötelező." },
        { status: 400 }
      )
    }

    const trimmedPassword = password.trim()

    if (!trimmedPassword) {
      return NextResponse.json(
        { success: false, error: "Jelszó megadása kötelező." },
        { status: 400 }
      )
    }

    if (!/^[a-zA-Z0-9]+$/.test(trimmedPassword) || trimmedPassword.length > 12) {
      return NextResponse.json(
        { success: false, error: "Érvénytelen kód formátum." },
        { status: 400 }
      )
    }

    // Validate Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[login] Missing Supabase credentials")
      return NextResponse.json(
        { success: false, error: "Szerver hiba. Próbáld újra később." },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Find user by password
    const { data: user, error: findError } = await supabase
      .from("may_competition_users")
      .select("id, first_login_at, is_solved, session_token, gave_up_at")
      .eq("generated_password", trimmedPassword)
      .single()

    if (findError || !user) {
      return NextResponse.json(
        { success: false, error: "Érvénytelen kód. Ellenőrizd a szervezőktől kapott meghívókódot." },
        { status: 401 }
      )
    }

    // Prevent simultaneous sessions: only block if a DIFFERENT user
    // (different browser with a different active cookie) tries to use the same password.
    // No cookie = retry from same user (lost cookie / failed redirect), allow it.
    // Gave-up users are always allowed to re-login.
    const cookieStore = await cookies()
    const existingCookie = cookieStore.get("competition_session")?.value
    if (user.session_token && existingCookie && existingCookie !== user.session_token && !user.gave_up_at) {
      return NextResponse.json(
        { success: false, error: "Ez a jelszó már használatban van." },
        { status: 409 }
      )
    }

    // Generate new session token (invalidates any previous sessions)
    const newSessionToken = crypto.randomUUID()

    // Update user with new session token and first_login_at if not set
    const updateData: Record<string, unknown> = {
      session_token: newSessionToken,
    }

    if (!user.first_login_at) {
      updateData.first_login_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from("may_competition_users")
      .update(updateData)
      .eq("id", user.id)

    if (updateError) {
      console.error("[login] Failed to update session:", updateError)
      return NextResponse.json(
        { success: false, error: "Bejelentkezés sikertelen. Próbáld újra." },
        { status: 500 }
      )
    }

    // Set session cookie
    cookieStore.set("competition_session", newSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      // Cookie expires at competition end
      expires: COMPETITION_END,
      path: "/",
    })

    // Check for existing game state
    const { data: existingState } = await supabase
      .from("may_game_state")
      .select("*")
      .eq("user_id", user.id)
      .single()

    let gameState = existingState

    if (!existingState) {
      // First login - create game state
      const { data: newState, error: stateError } = await supabase
        .from("may_game_state")
        .insert({ user_id: user.id, current_phase: "VIDEO_INTRO" })
        .select()
        .single()

      if (stateError) {
        console.error("[login] Failed to create game state:", stateError)
        // Non-fatal: user can still log in, game state will be created on next access
      } else {
        gameState = newState
      }
    }

    console.log("[login] User logged in successfully:", user.id)

    return NextResponse.json({
      success: true,
      userId: user.id,
      gameState,
      alreadySolved: user.is_solved,
    })
  } catch (error) {
    console.error("[login] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "Bejelentkezés sikertelen. Próbáld újra." },
      { status: 500 }
    )
  }
}

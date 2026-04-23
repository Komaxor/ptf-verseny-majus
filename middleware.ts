import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { COMPETITION_START, COMPETITION_END } from "@/lib/config"

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/waiting", "/closed", "/api/login"]

// Routes that should be protected (require valid session)
const PROTECTED_ROUTES = ["/", "/api/chat", "/api/verify-passcode", "/api/hint-click", "/api/solve-metrics", "/api/game-state", "/api/judge", "/api/context-clear"]

function isWithinCompetitionWindow(): "before" | "during" | "after" {
  const now = new Date()
  if (now < COMPETITION_START) return "before"
  if (now > COMPETITION_END) return "after"
  return "during"
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/subscribe-email")
  ) {
    return NextResponse.next()
  }

  const competitionStatus = isWithinCompetitionWindow()

  // Handle time-based redirects
  if (competitionStatus === "before") {
    // Before competition: only allow /waiting
    if (pathname !== "/waiting") {
      return NextResponse.redirect(new URL("/waiting", request.url))
    }
    return NextResponse.next()
  }

  if (competitionStatus === "after") {
    // Allow these APIs through after competition
    if (pathname === "/api/closed-metrics" || pathname === "/api/solve-metrics" || pathname === "/api/subscribe-email" || pathname === "/api/set-username") {
      return NextResponse.next()
    }

    // After competition: solved users go to /success, everyone else to /closed
    const sessionToken = request.cookies.get("competition_session")?.value
    if (sessionToken) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (supabaseUrl && supabaseServiceKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
          const { data: user } = await supabase
            .from("april_competition_users")
            .select("id, is_solved")
            .eq("session_token", sessionToken)
            .single()
          if (user?.is_solved) {
            if (pathname !== "/success") {
              return NextResponse.redirect(new URL("/success", request.url))
            }
            return NextResponse.next()
          }
        } catch {
          // If validation fails, fall through to /closed
        }
      }
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "A verseny véget ért." }, { status: 403 })
    }
    if (pathname !== "/closed") {
      return NextResponse.redirect(new URL("/closed", request.url))
    }
    return NextResponse.next()
  }

  // During competition window
  // Allow public routes without session check
  // But redirect authenticated users away from /login to /
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    if (pathname === "/login") {
      const sessionToken = request.cookies.get("competition_session")?.value
      if (sessionToken) {
        // Quick check if session is valid — redirect to main page
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (supabaseUrl && supabaseServiceKey) {
          try {
            const supabase = createClient(supabaseUrl, supabaseServiceKey, {
              auth: { autoRefreshToken: false, persistSession: false },
            })
            const { data: user } = await supabase
              .from("april_competition_users")
              .select("id")
              .eq("session_token", sessionToken)
              .single()
            if (user) {
              return NextResponse.redirect(new URL("/", request.url))
            }
          } catch {
            // If validation fails, let them stay on login
          }
        }
      }
    }
    return NextResponse.next()
  }

  // Check for session token in cookie
  const sessionToken = request.cookies.get("competition_session")?.value

  if (!sessionToken) {
    // No session, redirect to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Validate session token against database
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[middleware] Missing Supabase credentials")
    return NextResponse.next()
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: user, error } = await supabase
      .from("april_competition_users")
      .select("id, session_token, is_solved")
      .eq("session_token", sessionToken)
      .single()

    if (error || !user) {
      // Invalid session token (possibly invalidated by new login)
      const response = pathname.startsWith("/api/")
        ? NextResponse.json({ error: "Session expired. Please login again." }, { status: 401 })
        : NextResponse.redirect(new URL("/login", request.url))

      // Clear the invalid cookie
      response.cookies.delete("competition_session")
      return response
    }

    // Valid session - add user ID to headers for downstream use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-user-id", user.id)
    requestHeaders.set("x-user-solved", String(user.is_solved))

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    console.error("[middleware] Session validation error:", error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}

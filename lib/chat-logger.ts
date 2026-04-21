// Non-blocking chat analytics logger
// All operations fail gracefully - chat functionality always works

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Feature flag to disable logging entirely
const LOGGING_ENABLED = process.env.DISABLE_CHAT_LOGGING !== "true"

// Structured log helper: Timestamp | password | message
function slog(password: string | null, ...args: unknown[]) {
  console.log(new Date().toISOString(), "|", password ?? "N/A", "|", ...args)
}
function slogError(password: string | null, ...args: unknown[]) {
  console.error(new Date().toISOString(), "|", password ?? "N/A", "|", ...args)
}
function slogWarn(password: string | null, ...args: unknown[]) {
  console.warn(new Date().toISOString(), "|", password ?? "N/A", "|", ...args)
}

// Singleton client for logging
let loggingClient: SupabaseClient | null = null

function createLoggingClient(): SupabaseClient | null {
  if (loggingClient) {
    return loggingClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    slogError(null, "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return null
  }

  loggingClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return loggingClient
}

export interface ChatLoggerSession {
  sessionId: string | null
  challengeId: string
  sessionHash: string
  generatedPassword: string | null
}

// Get or create a chat session - returns null on any failure
export async function getOrCreateChatSession(
  sessionHash: string | null,
  challengeId: string,
  userIp: string,
  generatedPassword: string | null = null,
): Promise<ChatLoggerSession | null> {
  if (!LOGGING_ENABLED) {
    slog(null, "Logging disabled via env var")
    return null
  }

  if (!sessionHash) {
    slogWarn(null, "No session hash provided - cannot create session")
    return null
  }

  try {
    const supabase = createLoggingClient()
    if (!supabase) {
      slogWarn(generatedPassword, "Supabase client not available - logging disabled")
      return null
    }

    slog(generatedPassword, "Looking for existing session:", sessionHash.substring(0, 8) + "...", challengeId)

    // Try to find existing session
    const { data: existing, error: selectError } = await supabase
      .from("march_chat_sessions")
      .select("id, message_count")
      .eq("session_hash", sessionHash)
      .eq("challenge_id", challengeId)
      .limit(1)

    if (selectError) {
      slogError(generatedPassword, "Error finding session:", selectError.message)
      return null
    }

    if (existing && existing.length > 0) {
      slog(generatedPassword, "Found existing session:", existing[0].id, "message_count:", existing[0].message_count)
      return {
        sessionId: existing[0].id,
        challengeId,
        sessionHash,
        generatedPassword,
      }
    }

    slog(generatedPassword, "Creating new session for hash:", sessionHash.substring(0, 8) + "...")

    // Create new session
    const { data: newSession, error: insertError } = await supabase
      .from("march_chat_sessions")
      .insert({
        challenge_id: challengeId,
        session_hash: sessionHash,
        user_ip: userIp,
        message_count: 0,
        completed: false,
      })
      .select("id")
      .single()

    if (insertError) {
      // Handle unique constraint violation gracefully (race condition)
      if (insertError.code === "23505") {
        slog(generatedPassword, "Race condition - session already exists, fetching...")
        const { data: retry } = await supabase
          .from("march_chat_sessions")
          .select("id")
          .eq("session_hash", sessionHash)
          .eq("challenge_id", challengeId)
          .limit(1)

        if (retry && retry.length > 0) {
          return {
            sessionId: retry[0].id,
            challengeId,
            sessionHash,
            generatedPassword,
          }
        }
      }
      slogError(generatedPassword, "Error creating session:", insertError.message, insertError.code)
      return null
    }

    slog(generatedPassword, "Created new session:", newSession?.id)

    return {
      sessionId: newSession?.id || null,
      challengeId,
      sessionHash,
      generatedPassword,
    }
  } catch (error) {
    slogError(generatedPassword, "Unexpected error in getOrCreateChatSession:", error)
    return null
  }
}

export async function logChatMessage(
  sessionId: string | null,
  userMessage: string,
  assistantResponse: string,
  responseTimeMs: number,
  generatedPassword: string | null = null,
  tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number },
): Promise<void> {
  if (!LOGGING_ENABLED) {
    return
  }

  if (!sessionId) {
    slogWarn(generatedPassword, "No session ID provided - cannot log message")
    return
  }

  slog(generatedPassword, "Logging message for session:", sessionId)

  try {
    const supabase = createLoggingClient()
    if (!supabase) {
      slogWarn(generatedPassword, "Supabase client not available")
      return
    }

    // Insert message record
    const { error: messageError } = await supabase.from("march_chat_messages").insert({
      session_id: sessionId,
      user_message: userMessage,
      assistant_response: assistantResponse,
      response_time_ms: responseTimeMs,
      ...(tokenUsage?.promptTokens != null && { prompt_tokens: tokenUsage.promptTokens }),
      ...(tokenUsage?.completionTokens != null && { completion_tokens: tokenUsage.completionTokens }),
      ...(tokenUsage?.totalTokens != null && { total_tokens: tokenUsage.totalTokens }),
    })

    if (messageError) {
      slogError(generatedPassword, "Error logging message:", messageError.message)
    } else {
      slog(generatedPassword, "Message logged successfully")
    }

    // First get current count
    const { data: currentSession, error: fetchError } = await supabase
      .from("march_chat_sessions")
      .select("message_count")
      .eq("id", sessionId)
      .single()

    if (fetchError) {
      slogError(generatedPassword, "Error fetching current count:", fetchError.message)
      return
    }

    const currentCount = currentSession?.message_count || 0
    const newCount = currentCount + 1

    slog(generatedPassword, "Incrementing message_count:", currentCount, "->", newCount)

    const { error: updateError } = await supabase
      .from("march_chat_sessions")
      .update({
        message_count: newCount,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    if (updateError) {
      slogError(generatedPassword, "Error updating message count:", updateError.message)
    } else {
      slog(generatedPassword, "Message count updated to:", newCount)
    }
  } catch (error) {
    slogError(generatedPassword, "Unexpected error in logChatMessage:", error)
  }
}

export async function markSessionComplete(sessionHash: string | null, challengeId: string, generatedPassword: string | null = null): Promise<void> {
  if (!LOGGING_ENABLED) {
    return
  }

  if (!sessionHash) {
    slogWarn(generatedPassword, "No session hash provided - cannot mark complete")
    return
  }

  slog(generatedPassword, "Marking session complete:", sessionHash.substring(0, 8) + "...", challengeId)

  try {
    const supabase = createLoggingClient()
    if (!supabase) return

    const { data: session, error: findError } = await supabase
      .from("march_chat_sessions")
      .select("id, started_at, message_count, completed_at, completed")
      .eq("session_hash", sessionHash)
      .eq("challenge_id", challengeId)
      .limit(1)

    if (findError) {
      slogError(generatedPassword, "Error finding session:", findError.message)
      return
    }

    // Look up first_login_at from competition user to measure time from login
    let firstLoginAt: Date | null = null
    if (generatedPassword) {
      const { data: compUser } = await supabase
        .from("march_competition_users")
        .select("first_login_at")
        .eq("generated_password", generatedPassword)
        .single()
      if (compUser?.first_login_at) {
        firstLoginAt = new Date(compUser.first_login_at)
      }
    }

    if (!session || session.length === 0) {
      slogWarn(generatedPassword, "Session not found for completion marking - creating one now")
      const completedAt = new Date()
      const completionTimeSeconds = firstLoginAt
        ? Math.floor((completedAt.getTime() - firstLoginAt.getTime()) / 1000)
        : 0
      // Create a session if it doesn't exist (user may have solved without chatting)
      const { data: newSession, error: createError } = await supabase
        .from("march_chat_sessions")
        .insert({
          challenge_id: challengeId,
          session_hash: sessionHash,
          user_ip: "unknown",
          message_count: 0,
          completed: true,
          completed_at: completedAt.toISOString(),
          completion_time_seconds: completionTimeSeconds,
        })
        .select("id")
        .single()

      if (createError) {
        slogError(generatedPassword, "Error creating session for completion:", createError.message)
      } else {
        slog(generatedPassword, "Created and marked session complete:", newSession?.id, "completion_time_seconds:", completionTimeSeconds)
      }
      return
    }

    const sessionData = session[0]
    slog(generatedPassword, "Found session for completion:", sessionData.id, "message_count:", sessionData.message_count, "already_completed:", sessionData.completed)

    // Don't update if already completed
    if (sessionData.completed_at || sessionData.completed) {
      slog(generatedPassword, "Session already completed, skipping")
      return
    }

    const completedAt = new Date()
    // Use first_login_at (time from login), fall back to started_at (time from first message)
    const startedAt = firstLoginAt || new Date(sessionData.started_at)
    const completionTimeSeconds = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)

    const { error } = await supabase
      .from("march_chat_sessions")
      .update({
        completed: true,
        completed_at: completedAt.toISOString(),
        completion_time_seconds: completionTimeSeconds,
      })
      .eq("id", sessionData.id)

    if (error) {
      slogError(generatedPassword, "Error marking session complete:", error.message)
    } else {
      slog(generatedPassword, "Session marked complete:", "completion_time_seconds:", completionTimeSeconds, "message_count:", sessionData.message_count)
    }
  } catch (error) {
    slogError(generatedPassword, "Unexpected error in markSessionComplete:", error)
  }
}

// Check if session is completed for a challenge
export async function isSessionCompleted(sessionHash: string | null, challengeId: string): Promise<boolean> {
  if (!sessionHash) return false

  try {
    const supabase = createLoggingClient()
    if (!supabase) return false

    const { data, error } = await supabase
      .from("march_chat_sessions")
      .select("completed")
      .eq("session_hash", sessionHash)
      .eq("challenge_id", challengeId)
      .limit(1)

    if (error || !data || data.length === 0) {
      return false
    }

    return data[0].completed === true
  } catch {
    return false
  }
}

// Extract user IP from request headers
export function extractUserIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }

  const realIp = req.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }

  return "unknown"
}

// Non-blocking chat analytics logger for April heist competition
// All operations fail gracefully - chat functionality always works

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { ChatMessage } from "./types"

// Feature flag to disable logging entirely
const LOGGING_ENABLED = process.env.DISABLE_CHAT_LOGGING !== "true"

// Structured log helper: Timestamp | userId | message
function slog(userId: string | null, ...args: unknown[]) {
  console.log(new Date().toISOString(), "|", userId ?? "N/A", "|", ...args)
}
function slogError(userId: string | null, ...args: unknown[]) {
  console.error(new Date().toISOString(), "|", userId ?? "N/A", "|", ...args)
}
function slogWarn(userId: string | null, ...args: unknown[]) {
  console.warn(new Date().toISOString(), "|", userId ?? "N/A", "|", ...args)
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
  round: number
  sessionHash: string
  userId: string
}

export interface TokenUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

// Get or create a chat session - returns session info on any failure
export async function getOrCreateChatSession(
  sessionHash: string,
  round: number,
  userIp: string,
  userId: string,
): Promise<ChatLoggerSession> {
  const fallback: ChatLoggerSession = { sessionId: null, round, sessionHash, userId }

  if (!LOGGING_ENABLED) {
    slog(userId, "Logging disabled via env var")
    return fallback
  }

  if (!sessionHash) {
    slogWarn(userId, "No session hash provided - cannot create session")
    return fallback
  }

  try {
    const supabase = createLoggingClient()
    if (!supabase) {
      slogWarn(userId, "Supabase client not available - logging disabled")
      return fallback
    }

    slog(userId, "Looking for existing session:", sessionHash.substring(0, 8) + "...", "round:", round)

    // Try to find existing session
    const { data: existing, error: selectError } = await supabase
      .from("may_chat_sessions")
      .select("id, message_count")
      .eq("session_hash", sessionHash)
      .eq("round", round)
      .limit(1)

    if (selectError) {
      slogError(userId, "Error finding session:", selectError.message)
      return fallback
    }

    if (existing && existing.length > 0) {
      slog(userId, "Found existing session:", existing[0].id, "message_count:", existing[0].message_count)
      return {
        sessionId: existing[0].id,
        round,
        sessionHash,
        userId,
      }
    }

    slog(userId, "Creating new session for hash:", sessionHash.substring(0, 8) + "...")

    // Create new session
    const { data: newSession, error: insertError } = await supabase
      .from("may_chat_sessions")
      .insert({
        user_id: userId,
        session_hash: sessionHash,
        round,
        user_ip: userIp,
        message_count: 0,
        completed: false,
      })
      .select("id")
      .single()

    if (insertError) {
      // Handle unique constraint violation gracefully (race condition)
      if (insertError.code === "23505") {
        slog(userId, "Race condition - session already exists, fetching...")
        const { data: retry } = await supabase
          .from("may_chat_sessions")
          .select("id")
          .eq("session_hash", sessionHash)
          .eq("round", round)
          .limit(1)

        if (retry && retry.length > 0) {
          return {
            sessionId: retry[0].id,
            round,
            sessionHash,
            userId,
          }
        }
      }
      slogError(userId, "Error creating session:", insertError.message, insertError.code)
      return fallback
    }

    slog(userId, "Created new session:", newSession?.id)

    return {
      sessionId: newSession?.id || null,
      round,
      sessionHash,
      userId,
    }
  } catch (error) {
    slogError(userId, "Unexpected error in getOrCreateChatSession:", error)
    return fallback
  }
}

export async function logChatMessage(
  sessionId: string | null,
  userId: string,
  round: number,
  role: "user" | "assistant" | "tool_call" | "tool_result",
  content: string,
  responseTimeMs?: number,
  tokenUsage?: TokenUsage,
): Promise<void> {
  if (!LOGGING_ENABLED) {
    return
  }

  // tool_call and tool_result are tracked in may_tool_calls, skip chat log
  if (role === "tool_call" || role === "tool_result") {
    return
  }

  if (!sessionId) {
    slogWarn(userId, "No session ID provided - cannot log message")
    return
  }

  slog(userId, "Logging", role, "message for session:", sessionId)

  try {
    const supabase = createLoggingClient()
    if (!supabase) {
      slogWarn(userId, "Supabase client not available")
      return
    }

    // Insert message record
    const { error: messageError } = await supabase.from("may_chat_messages").insert({
      session_id: sessionId,
      user_id: userId,
      round,
      role,
      content,
      ...(responseTimeMs != null && { response_time_ms: responseTimeMs }),
      ...(tokenUsage?.prompt_tokens != null && { prompt_tokens: tokenUsage.prompt_tokens }),
      ...(tokenUsage?.completion_tokens != null && { completion_tokens: tokenUsage.completion_tokens }),
      ...(tokenUsage?.total_tokens != null && { total_tokens: tokenUsage.total_tokens }),
    })

    if (messageError) {
      slogError(userId, "Error logging message:", messageError.message)
    } else {
      slog(userId, "Message logged successfully")
    }

    // Increment session message count (only for user messages)
    if (role === "user") {
      const { data: currentSession, error: fetchError } = await supabase
        .from("may_chat_sessions")
        .select("message_count")
        .eq("id", sessionId)
        .single()

      if (fetchError) {
        slogError(userId, "Error fetching current count:", fetchError.message)
        return
      }

      const currentCount = currentSession?.message_count || 0
      const newCount = currentCount + 1

      const { error: updateError } = await supabase
        .from("may_chat_sessions")
        .update({
          message_count: newCount,
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", sessionId)

      if (updateError) {
        slogError(userId, "Error updating message count:", updateError.message)
      } else {
        slog(userId, "Message count updated to:", newCount)
      }
    }
  } catch (error) {
    slogError(userId, "Unexpected error in logChatMessage:", error)
  }
}

export async function logToolCall(
  sessionId: string | null,
  userId: string,
  round: number,
  toolName: string,
): Promise<void> {
  if (!LOGGING_ENABLED || !sessionId) return

  try {
    const supabase = createLoggingClient()
    if (!supabase) return

    const { error } = await supabase.from("may_tool_calls").insert({
      session_id: sessionId,
      user_id: userId,
      round,
      tool_name: toolName,
    })

    if (error) {
      slogError(userId, "Error logging tool call:", error.message)
    } else {
      slog(userId, "Tool call logged:", toolName)
    }
  } catch (error) {
    slogError(userId, "Unexpected error in logToolCall:", error)
  }
}

export async function logContextClear(
  userId: string,
  round: number,
): Promise<void> {
  if (!LOGGING_ENABLED) return

  try {
    const supabase = createLoggingClient()
    if (!supabase) return

    const { error } = await supabase.from("may_context_clears").insert({
      user_id: userId,
      round,
    })

    if (error) {
      slogError(userId, "Error logging context clear:", error.message)
    } else {
      slog(userId, "Context clear logged for round:", round)
    }
  } catch (error) {
    slogError(userId, "Unexpected error in logContextClear:", error)
  }
}

export async function getMessagesAfterLastClear(
  userId: string,
  round: number,
): Promise<ChatMessage[]> {
  try {
    const supabase = createLoggingClient()
    if (!supabase) return []

    // Find the most recent context clear for this user/round
    const { data: lastClear } = await supabase
      .from("may_context_clears")
      .select("cleared_at")
      .eq("user_id", userId)
      .eq("round", round)
      .order("cleared_at", { ascending: false })
      .limit(1)
      .single()

    // Query messages after the last clear (or all if no clear)
    let query = supabase
      .from("may_chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .eq("round", round)
      .order("created_at", { ascending: true })

    if (lastClear?.cleared_at) {
      query = query.gt("created_at", lastClear.cleared_at)
    }

    const { data: messages, error } = await query

    if (error) {
      slogError(userId, "Error fetching messages after clear:", error.message)
      return []
    }

    return (messages || []) as ChatMessage[]
  } catch (error) {
    slogError(userId, "Unexpected error in getMessagesAfterLastClear:", error)
    return []
  }
}

export async function markRoundComplete(
  userId: string,
  round: number,
  sessionHash: string,
): Promise<void> {
  if (!LOGGING_ENABLED) return

  try {
    const supabase = createLoggingClient()
    if (!supabase) return

    slog(userId, "Marking round", round, "session complete:", sessionHash.substring(0, 8) + "...")

    const { data: session, error: findError } = await supabase
      .from("may_chat_sessions")
      .select("id, started_at, message_count, completed_at, completed")
      .eq("session_hash", sessionHash)
      .eq("round", round)
      .limit(1)

    if (findError) {
      slogError(userId, "Error finding session:", findError.message)
      return
    }

    if (!session || session.length === 0) {
      slogWarn(userId, "Session not found for completion marking")
      return
    }

    const sessionData = session[0]

    // Don't update if already completed
    if (sessionData.completed_at || sessionData.completed) {
      slog(userId, "Session already completed, skipping")
      return
    }

    const completedAt = new Date()
    const startedAt = new Date(sessionData.started_at)
    const completionTimeSeconds = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)

    const { error } = await supabase
      .from("may_chat_sessions")
      .update({
        completed: true,
        completed_at: completedAt.toISOString(),
        completion_time_seconds: completionTimeSeconds,
      })
      .eq("id", sessionData.id)

    if (error) {
      slogError(userId, "Error marking session complete:", error.message)
    } else {
      slog(userId, "Session marked complete:", "completion_time_seconds:", completionTimeSeconds)
    }
  } catch (error) {
    slogError(userId, "Unexpected error in markRoundComplete:", error)
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

// Bypasses AI SDK abstraction to avoid Zod version conflicts
import OpenAI from "openai"
import { getOrCreateChatSession, logChatMessage, extractUserIp, isSessionCompleted } from "@/lib/chat-logger"
import { getActiveChallenge, buildSystemPrompt } from "@/lib/challenge-loader"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { COMPETITION_END } from "@/lib/config"

export const maxDuration = 30

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

// Get authenticated competition user and increment message count
async function getAndTrackCompetitionUser(sessionHash: string | null): Promise<{ userId: string; generatedPassword: string | null } | null> {
  try {
    const cookieStore = await cookies()
    const competitionSession = cookieStore.get("competition_session")?.value

    if (!competitionSession) return null

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) return null

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: user, error } = await supabase
      .from("march_competition_users")
      .select("id, generated_password")
      .eq("session_token", competitionSession)
      .single()

    if (error || !user) return null

    // Increment message count for competition tracking
    await supabase.rpc("march_increment_user_chat_messages", { user_id: user.id })

    // Link session hash to user (ignore duplicates)
    if (sessionHash) {
      await supabase
        .from("march_user_session_links")
        .upsert({ user_id: user.id, session_hash: sessionHash }, { onConflict: "user_id,session_hash" })
    }

    return { userId: user.id, generatedPassword: user.generated_password ?? null }
  } catch {
    return null
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function POST(req: Request) {
  console.log("[v0] Chat API POST called")
  const requestStartTime = Date.now()

  // Check if competition has ended
  if (new Date() > COMPETITION_END) {
    return new Response(JSON.stringify({ error: "A verseny már véget ért." }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    })
  }

  let messages
  let sessionHash: string | null = null
  try {
    const body = await req.json()
    messages = body.messages
    sessionHash = body.session_hash || null
    console.log(
      "[v0] Request body parsed, messages count:",
      messages?.length,
      "sessionHash:",
      sessionHash ? sessionHash.substring(0, 8) + "..." : "null",
    )
  } catch (err) {
    console.log("[v0] Failed to parse request body:", err)
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    })
  }

  if (!sessionHash) {
    console.warn("[v0] No session hash in request - chat will not be logged")
  }

  // Track competition user message
  const competitionUser = await getAndTrackCompetitionUser(sessionHash)
  const generatedPassword = competitionUser?.generatedPassword ?? null
  if (competitionUser) {
    console.log(new Date().toISOString(), "|", generatedPassword ?? "N/A", "|", "Competition user tracked:", competitionUser.userId)
  }

  let challengeId = "unknown"
  let systemPrompt = "You are a helpful AI assistant."
  let challenge = null

  try {
    console.log("[v0] Loading active challenge...")
    challenge = await getActiveChallenge()
    console.log("[v0] Challenge loaded:", challenge?.id)
    challengeId = challenge?.id || "unknown"
    systemPrompt = buildSystemPrompt(challenge)
    console.log("[v0] System prompt built, length:", systemPrompt.length)
  } catch (error) {
    console.error("[v0] Failed to load challenge:", error)
  }

  if (sessionHash && challenge) {
    const completed = await isSessionCompleted(sessionHash, challengeId)
    if (completed) {
      console.log("[v0] Session already completed, returning success message")
      const successMessage =
        challenge.metadata.successMessage || "Congratulations! You've already completed this challenge."

      // Return the success message as a stream response
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: successMessage })}\n\n`))
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        },
      })

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          ...corsHeaders,
        },
      })
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    console.log("[v0] Missing OPENAI_API_KEY")
    return new Response(JSON.stringify({ error: "OpenAI API key is not configured" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    })
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  let chatSession: { sessionId: string | null; challengeId: string; sessionHash: string; generatedPassword: string | null } | null = null
  try {
    const userIp = extractUserIp(req)
    console.log(new Date().toISOString(), "|", generatedPassword ?? "N/A", "|", "Creating/getting chat session for hash:", sessionHash?.substring(0, 8) + "...")
    chatSession = await getOrCreateChatSession(sessionHash, challengeId, userIp, generatedPassword)
    console.log("[v0] Chat session result:", chatSession?.sessionId ? "ID: " + chatSession.sessionId : "null")
  } catch (error) {
    console.error("[v0] Failed to initialize chat session:", error)
  }

  const userMessage = messages[messages.length - 1]?.content || ""

  // Convert messages to OpenAI format
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((msg: { role: string; content?: string; parts?: { type: string; text: string }[] }) => ({
      role: msg.role as "user" | "assistant",
      content: msg.parts?.find((p) => p.type === "text")?.text || msg.content || "",
    })),
  ]

  let stream
  try {
    console.log("[v0] Creating OpenAI stream...")
    stream = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: openaiMessages,
      stream: true,
      stream_options: { include_usage: true },
    })
    console.log("[v0] OpenAI stream created")
  } catch (error) {
    console.error("[v0] OpenAI stream creation failed:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to connect to OpenAI"
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    })
  }

  let fullAssistantResponse = ""
  let tokenUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } = {}

  // Create a ReadableStream to return SSE-formatted response
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || ""
          if (content) {
            fullAssistantResponse += content
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
          }
          // Capture token usage from the final chunk
          if (chunk.usage) {
            tokenUsage = {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens,
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))

        const responseTimeMs = Date.now() - requestStartTime
        console.log("[v0] Stream complete, logging message. SessionId:", chatSession?.sessionId, "Tokens:", tokenUsage)

        if (chatSession?.sessionId) {
          try {
            await logChatMessage(chatSession.sessionId, userMessage, fullAssistantResponse, responseTimeMs, chatSession.generatedPassword, tokenUsage)
            console.log("[v0] Message logged successfully")
          } catch (err) {
            console.error("[v0] Failed to log message:", err)
          }
        } else {
          console.warn("[v0] No session ID - message not logged")
        }
      } catch (error) {
        console.error("[v0] Stream error:", error)
        const errorMessage = error instanceof Error ? error.message : "Stream error occurred"
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  // Return the response immediately so SSE chunks stream to the client in real-time.
  // Logging runs inside the stream's start() before controller.close(), so the
  // serverless function stays alive until logging completes.
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...corsHeaders,
    },
  })
}

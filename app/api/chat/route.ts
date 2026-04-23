import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import OpenAI from "openai"
import { createServiceClient } from "@/lib/supabase/server"
import {
  loadRoundConfig,
  loadSystemPrompt,
  loadToolFile,
  getToolFileName,
  extractWelcomeMessage,
} from "@/lib/round-loader"
import {
  getOrCreateChatSession,
  logChatMessage,
  logToolCall,
  getMessagesAfterLastClear,
  extractUserIp,
} from "@/lib/chat-logger"
import { CHAT_COOLDOWN_MS } from "@/lib/config"

export const maxDuration = 60

// Build OpenAI tool definitions for a round
function buildToolDefinitions(round: number) {
  const config = loadRoundConfig(round)
  const toolDefs: OpenAI.Chat.Completions.ChatCompletionTool[] = config.tools.map(
    (toolName) => ({
      type: "function" as const,
      function: {
        name: toolName,
        description: getToolDescription(toolName),
        parameters: { type: "object" as const, properties: {}, required: [] },
      },
    })
  )
  return toolDefs
}

function getToolDescription(toolName: string): string {
  const descriptions: Record<string, string> = {
    search_building_directory: "Az épület bérlői nyilvántartásának keresése. Megmutatja, melyik cég melyik emeleten és ajtószámon található.",
    check_floor_plan: "Egy adott emelet alaprajzának megtekintése. Megmutatja a szobák számozását és elrendezését.",
    read_security_protocols: "Az épület biztonsági szabályzatának olvasása.",
    check_maintenance_schedule: "Az épület karbantartási ütemtervének megtekintése.",
    read_building_rules: "Az épület házirendjének olvasása (nyitvatartás, szabályok).",
    check_announcements: "Az épület legfrissebb közleményeinek megtekintése.",
    search_employee_directory: "A Mase Capital dolgozói névsorának keresése név vagy beosztás alapján.",
    check_visitor_policy: "A látogatói szabályzat megtekintése.",
    check_daily_schedule: "A mai napi beosztás megtekintése: megbeszélések, várt látogatók.",
    read_company_profile: "A Mase Capital cégprofiljának olvasása.",
    check_meeting_rooms: "A tárgyalótermek foglaltságának megtekintése.",
    read_internal_memos: "Belső levelezés és közlemények olvasása.",
    schedule_appointment: "Időpontfoglalás megtekintése: elérhető szabad időpontok és foglalási szabályok.",
    search_emails: "Search Viktor Mase's recent emails by keyword or sender.",
    read_file: "Open and read a file from Viktor's desktop or documents.",
    check_calendar: "View Viktor's upcoming calendar entries.",
    search_notes: "Search Viktor's personal notes and reminders.",
    check_browser_bookmarks: "View Viktor's saved browser bookmarks.",
    read_portfolio: "View the fund's current portfolio positions.",
  }
  return descriptions[toolName] || toolName
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now()

  if (!process.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "OpenAI API key is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const supabase = await createServiceClient()

  // Auth
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("competition_session")?.value
  if (!sessionToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const { data: user } = await supabase
    .from("april_competition_users")
    .select("id")
    .eq("session_token", sessionToken)
    .single()

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 })
  }

  const { message, sessionHash, round } = body as {
    message: string
    sessionHash: string
    round: number
  }

  if (!message || !sessionHash || !round || round < 1 || round > 3) {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400 })
  }

  // Rate limiting (3s cooldown)
  const { data: lastMsg } = await supabase
    .from("april_chat_messages")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("round", round)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (lastMsg) {
    const elapsed = Date.now() - new Date(lastMsg.created_at).getTime()
    if (elapsed < CHAT_COOLDOWN_MS) {
      const waitTime = Math.ceil((CHAT_COOLDOWN_MS - elapsed) / 1000)
      return new Response(
        JSON.stringify({ error: `Kérlek várj ${waitTime} másodpercet.`, rateLimited: true, waitTime }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      )
    }
  }

  // Get/create chat session
  const userIp = extractUserIp(request)
  const session = await getOrCreateChatSession(sessionHash, round, userIp, user.id)

  // Increment message count
  await supabase.rpc("april_increment_user_chat_messages", { p_user_id: user.id })

  // Link user to session
  await supabase
    .from("april_user_session_links")
    .upsert({ user_id: user.id, session_hash: sessionHash }, { onConflict: "user_id,session_hash" })

  // Log user message
  await logChatMessage(session.sessionId, user.id, round, "user", message)

  // Build conversation history
  const systemPrompt = loadSystemPrompt(round)
  const welcomeMessage = extractWelcomeMessage(systemPrompt)
  const priorMessages = await getMessagesAfterLastClear(user.id, round)

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "assistant", content: welcomeMessage },
    ...priorMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ]

  // Tool definitions
  const tools = buildToolDefinitions(round)

  try {
    // Agent loop: call OpenAI, handle tool calls, repeat until text response
    let response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
      stream: false,
    })

    // Handle tool calls iteratively
    while (response.choices[0]?.finish_reason === "tool_calls") {
      const toolCalls = response.choices[0].message.tool_calls || []
      messages.push(response.choices[0].message)

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name
        let toolResult: string

        try {
          const fileName = getToolFileName(round, toolName)
          toolResult = loadToolFile(round, fileName)
          // Log tool call
          await logToolCall(session.sessionId, user.id, round, toolName)
        } catch {
          toolResult = JSON.stringify({ error: "File not found" })
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        })
      }

      // Call again with tool results
      response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools,
        stream: false,
      })
    }

    // Get the final response content
    const finalContent = response.choices[0]?.message?.content || ""
    const responseTimeMs = Date.now() - requestStartTime
    const usage = response.usage

    // Log assistant message
    await logChatMessage(
      session.sessionId, user.id, round, "assistant", finalContent,
      responseTimeMs,
      usage ? {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      } : undefined
    )

    // Stream the response via SSE (simulated streaming for consistent UX)
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const words = finalContent.split(" ")
        let i = 0
        const interval = setInterval(() => {
          if (i < words.length) {
            const chunk = (i === 0 ? "" : " ") + words[i]
            const data = JSON.stringify({ content: chunk })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            i++
          } else {
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
            controller.close()
            clearInterval(interval)
          }
        }, 30) // ~30ms per word for natural feel
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[chat] OpenAI error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to connect to OpenAI"
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200 })
}

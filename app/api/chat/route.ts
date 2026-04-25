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
  TOOL_FILE_MAP,
} from "@/lib/round-loader"
import {
  getOrCreateChatSession,
  logChatMessage,
  logToolCall,
  getMessagesAfterLastClear,
  extractUserIp,
  type TokenUsage,
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
        parameters: toolName === "read_file"
          ? {
              type: "object" as const,
              properties: {
                filename: {
                  type: "string",
                  description: "A megnyitandó fájl neve (pl. personal-notes.md, safe-config.md, emails-recent.md)",
                },
              },
              required: ["filename"],
            }
          : { type: "object" as const, properties: {}, required: [] },
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
    search_emails: "Mase Viktor legutóbbi e-mailjeinek keresése kulcsszó vagy feladó alapján.",
    read_file: "Fájl megnyitása és olvasása Viktor asztaláról vagy dokumentumaiból.",
    check_calendar: "Viktor közelgő naptárbejegyzéseinek megtekintése.",
    search_notes: "Viktor személyes jegyzeteinek és emlékeztetőinek keresése.",
    check_browser_bookmarks: "Viktor mentett böngésző könyvjelzőinek megtekintése.",
    read_portfolio: "Az alap aktuális portfólió pozícióinak megtekintése.",
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
  ]

  // Reconstruct prior messages including tool calls
  for (const m of priorMessages) {
    if (m.role === "tool_call") {
      // Stored as JSON: { tool_calls: [...] }
      try {
        const parsed = JSON.parse(m.content)
        // Ensure each tool_call has the required `type` field
        const toolCalls = parsed.tool_calls.map((tc: Record<string, unknown>) => ({ type: "function", ...tc }))
        messages.push({ role: "assistant", content: null, tool_calls: toolCalls })
      } catch {
        // Skip malformed tool_call records
      }
    } else if (m.role === "tool_result") {
      // Stored as JSON: { tool_call_id, content }
      try {
        const parsed = JSON.parse(m.content)
        messages.push({ role: "tool", tool_call_id: parsed.tool_call_id, content: parsed.content })
      } catch {
        // Skip malformed tool_result records
      }
    } else {
      messages.push({ role: m.role as "user" | "assistant", content: m.content })
    }
  }

  // Tool definitions
  const tools = buildToolDefinitions(round)

  // Helper: resolve a tool call to its result string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function resolveToolCall(toolCall: any): Promise<string> {
    const fn = toolCall.function as { name: string; arguments: string }
    const toolName = fn.name
    try {
      let fileName: string
      if (toolName === "read_file") {
        const args = JSON.parse(fn.arguments || "{}")
        const requested = (args.filename || "").replace(/\.md$/, "")
        const roundMap = TOOL_FILE_MAP[round]
        const knownFiles = roundMap ? Object.values(roundMap) : []
        if (requested && knownFiles.includes(requested)) {
          fileName = requested
        } else if (requested) {
          // Unknown filename — return error with available files
          const availableFiles = knownFiles.map((f) => `${f}.md`).join(", ")
          await logToolCall(session.sessionId, user!.id, round, toolName)
          return `Hiba: A(z) "${args.filename}" fájl nem található. Elérhető fájlok: ${availableFiles}`
        } else {
          // No filename provided
          const availableFiles = knownFiles.map((f) => `${f}.md`).join(", ")
          await logToolCall(session.sessionId, user!.id, round, toolName)
          return `Kérlek, add meg a fájlnevet. Elérhető fájlok: ${availableFiles}`
        }
      } else {
        fileName = getToolFileName(round, toolName)
      }
      const result = loadToolFile(round, fileName)
      await logToolCall(session.sessionId, user!.id, round, toolName)
      return result
    } catch {
      return JSON.stringify({ error: "File not found" })
    }
  }

  try {
    const encoder = new TextEncoder()
    let fullContent = ""

    // Consume one streaming OpenAI call. Forwards text tokens to the writer
    // and returns accumulated tool calls (empty array if none).
    async function streamOnce(
      writer: WritableStreamDefaultWriter<Uint8Array>,
    ) {
      const openaiStream = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages,
        tools,
        stream: true,
        stream_options: { include_usage: true },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accToolCalls: any[] = []
      let usage: TokenUsage | undefined

      for await (const chunk of openaiStream) {
        const delta = chunk.choices[0]?.delta

        if (delta?.content) {
          fullContent += delta.content
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ content: delta.content })}\n\n`)
          )
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0
            if (!accToolCalls[idx]) {
              accToolCalls[idx] = { id: "", type: "function", function: { name: "", arguments: "" } }
            }
            if (tc.id) accToolCalls[idx].id = tc.id
            if (tc.function?.name) accToolCalls[idx].function.name += tc.function.name
            if (tc.function?.arguments) accToolCalls[idx].function.arguments += tc.function.arguments
          }
        }

        if (chunk.usage) {
          usage = {
            prompt_tokens: chunk.usage.prompt_tokens,
            completion_tokens: chunk.usage.completion_tokens,
            total_tokens: chunk.usage.total_tokens,
          }
        }
      }

      return { toolCalls: accToolCalls, usage }
    }

    const { readable, writable } = new TransformStream<Uint8Array>()
    const writer = writable.getWriter()

    // Drive the stream in the background — the Response starts flushing
    // readable to the client immediately.
    const pump = (async () => {
      try {
        const totalUsage: TokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { toolCalls, usage } = await streamOnce(writer)

          if (usage) {
            totalUsage.prompt_tokens! += usage.prompt_tokens ?? 0
            totalUsage.completion_tokens! += usage.completion_tokens ?? 0
            totalUsage.total_tokens! += usage.total_tokens ?? 0
          }

          if (toolCalls.length === 0) break

          // Resolve tool calls and feed results back for the next iteration
          messages.push({ role: "assistant", content: null, tool_calls: toolCalls } as OpenAI.Chat.Completions.ChatCompletionMessageParam)

          await logChatMessage(
            session.sessionId, user.id, round, "tool_call",
            JSON.stringify({ tool_calls: toolCalls })
          )

          for (const tc of toolCalls) {
            const toolResult = await resolveToolCall(tc)
            messages.push({ role: "tool", tool_call_id: tc.id, content: toolResult })

            await logChatMessage(
              session.sessionId, user.id, round, "tool_result",
              JSON.stringify({ tool_call_id: tc.id, content: toolResult })
            )
          }
        }

        await writer.write(encoder.encode(`data: [DONE]\n\n`))
        await writer.close()

        const responseTimeMs = Date.now() - requestStartTime
        await logChatMessage(
          session.sessionId, user.id, round, "assistant", fullContent,
          responseTimeMs,
          totalUsage
        )
      } catch (err) {
        console.error("[chat] Stream error:", err)
        await writer.abort(err instanceof Error ? err : new Error(String(err)))
      }
    })()

    // Prevent unhandled rejection if pump fails after response is sent
    pump.catch(() => {})

    return new Response(readable, {
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

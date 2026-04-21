/**
 * READ-ONLY Supabase export script
 *
 * This script ONLY performs HTTP GET requests against the Supabase REST API.
 * It cannot and does not modify any data in the database.
 *
 * Exports March 2026 competition data
 * into a single nested JSON file for offline analysis.
 *
 * Usage: npx tsx scripts/export-db.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load env vars from .env.local
const envPath = resolve(__dirname, "../.env.local")
const envContent = readFileSync(envPath, "utf-8")
const env: Record<string, string> = {}
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) env[match[1].trim()] = match[2].trim()
}

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
const SERVICE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
}

// March competition window — update these for your event
const WINDOW_START = "2026-03-21T14:00:00Z"
const WINDOW_END = "2026-03-21T16:00:00Z"

async function get(table: string, query: string): Promise<any[]> {
  const allRows: any[] = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`
    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...HEADERS,
        Range: `${offset}-${offset + pageSize - 1}`,
      },
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`GET ${table} failed (${res.status}): ${body}`)
    }

    const rows = await res.json()
    allRows.push(...rows)

    if (rows.length < pageSize) break
    offset += pageSize
  }

  return allRows
}

async function main() {
  console.log("Exporting March 2026 competition data...")
  console.log("Read-only mode: only GET requests\n")

  // Step 1: Fetch all competition users who logged in during the window
  console.log("Step 1: Fetching competition users...")
  const users = await get(
    "march_competition_users",
    `select=id,generated_password,username,email,first_login_at,solved_at,total_passcode_attempts,total_chat_messages,total_hint_clicks,is_solved,created_at&first_login_at=gte.${WINDOW_START}&first_login_at=lt.${WINDOW_END}&order=first_login_at.asc`
  )
  console.log(`  Found ${users.length} users`)

  if (users.length === 0) {
    console.log("No users found in the competition window. Exiting.")
    process.exit(0)
  }

  // Step 2: Fetch user_session_links for these users
  console.log("Step 2: Fetching session links...")
  const userIds = users.map((u: any) => u.id)
  const orFilter = userIds.map((id: string) => `user_id.eq.${id}`).join(",")
  const sessionLinks = await get(
    "march_user_session_links",
    `select=user_id,session_hash&or=(${orFilter})`
  )
  console.log(`  Found ${sessionLinks.length} session links`)

  // Build map: user_id → session_hashes
  const userSessionMap = new Map<string, string[]>()
  for (const link of sessionLinks) {
    const list = userSessionMap.get(link.user_id) || []
    list.push(link.session_hash)
    userSessionMap.set(link.user_id, list)
  }

  // Step 3: Fetch chat_sessions for all session_hashes
  console.log("Step 3: Fetching chat sessions...")
  const allSessionHashes = sessionLinks.map((l: any) => l.session_hash)

  let chatSessions: any[] = []
  if (allSessionHashes.length > 0) {
    const sessionOrFilter = allSessionHashes.map((h: string) => `session_hash.eq.${h}`).join(",")
    chatSessions = await get(
      "march_chat_sessions",
      `select=id,session_hash,completed,completion_time_seconds,message_count,started_at,last_activity_at,completed_at,user_ip&or=(${sessionOrFilter})&order=started_at.asc`
    )
  }
  console.log(`  Found ${chatSessions.length} chat sessions`)

  // Build map: session_hash → session data
  const sessionByHash = new Map<string, any>()
  for (const s of chatSessions) {
    sessionByHash.set(s.session_hash, s)
  }

  // Step 4: Fetch chat_messages for those sessions
  console.log("Step 4: Fetching chat messages...")
  const sessionIds = chatSessions.map((s: any) => s.id)

  let chatMessages: any[] = []
  if (sessionIds.length > 0) {
    const msgOrFilter = sessionIds.map((id: string) => `session_id.eq.${id}`).join(",")
    chatMessages = await get(
      "march_chat_messages",
      `select=session_id,user_message,assistant_response,created_at,response_time_ms&or=(${msgOrFilter})&order=created_at.asc`
    )
  }
  console.log(`  Found ${chatMessages.length} chat messages`)

  // Build map: session_id → messages
  const messagesBySession = new Map<string, any[]>()
  for (const m of chatMessages) {
    const list = messagesBySession.get(m.session_id) || []
    list.push({
      user: m.user_message,
      assistant: m.assistant_response,
      created_at: m.created_at,
      response_time_ms: m.response_time_ms,
    })
    messagesBySession.set(m.session_id, list)
  }

  // Step 5: Assemble nested structure
  console.log("Step 5: Assembling nested structure...")
  const result = users.map((user: any) => {
    const sessionHashes = userSessionMap.get(user.id) || []
    const sessions = sessionHashes
      .map((hash: string) => {
        const session = sessionByHash.get(hash)
        if (!session) return null
        return {
          session_hash: session.session_hash,
          completed: session.completed,
          completion_time_seconds: session.completion_time_seconds,
          message_count: session.message_count,
          started_at: session.started_at,
          last_activity_at: session.last_activity_at,
          completed_at: session.completed_at,
          messages: messagesBySession.get(session.id) || [],
        }
      })
      .filter(Boolean)

    return {
      generated_password: user.generated_password,
      username: user.username,
      email: user.email,
      is_solved: user.is_solved,
      solved_at: user.solved_at,
      first_login_at: user.first_login_at,
      total_passcode_attempts: user.total_passcode_attempts,
      total_chat_messages: user.total_chat_messages,
      total_hint_clicks: user.total_hint_clicks,
      sessions,
    }
  })

  // Sort: solved users first (by solved_at), then unsolved
  result.sort((a: any, b: any) => {
    if (a.is_solved && !b.is_solved) return -1
    if (!a.is_solved && b.is_solved) return 1
    if (a.solved_at && b.solved_at) return a.solved_at.localeCompare(b.solved_at)
    return 0
  })

  // Write output
  const outDir = resolve(__dirname, "../data/db-export")
  mkdirSync(outDir, { recursive: true })
  const outPath = resolve(outDir, "march-21-competition-export.json")
  writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8")

  console.log(`\nExport complete: ${outPath}`)
  console.log(`  Users: ${result.length}`)
  console.log(`  Sessions: ${chatSessions.length}`)
  console.log(`  Messages: ${chatMessages.length}`)
  console.log(`  Solved: ${result.filter((u: any) => u.is_solved).length}`)
  console.log(`  Unsolved: ${result.filter((u: any) => !u.is_solved).length}`)
}

main().catch((err) => {
  console.error("Export failed:", err)
  process.exit(1)
})

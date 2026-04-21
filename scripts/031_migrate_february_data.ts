/**
 * Migrate February competition data from shared tables into february_* tables.
 *
 * Prerequisites:
 *   1. Run 030_february_competition_tables.sql in Supabase SQL Editor
 *   2. Have the v0 backup at ../v0-prompt-the-flag/data/db-backup/
 *
 * Reads from backup file, inserts into new february_* tables via REST API.
 * Preserves original UUIDs so foreign key relationships stay intact.
 *
 * Usage: npx tsx scripts/031_migrate_february_data.ts
 */

import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { gunzipSync } from "zlib"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load env
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
}

// Load backup
const backupPath = resolve(__dirname, "../../v0-prompt-the-flag/data/db-backup/full-backup-2026-03-21T15-52-07.json.gz")
const data = JSON.parse(gunzipSync(readFileSync(backupPath)).toString())

const FEB_CHALLENGE_ID = "competition-001"

async function insertBatch(table: string, rows: any[], batchSize = 100): Promise<number> {
  let inserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        ...HEADERS,
        Prefer: "return=minimal,resolution=ignore-duplicates",
      },
      body: JSON.stringify(batch),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`INSERT ${table} batch ${i} failed (${res.status}): ${body}`)
    }
    inserted += batch.length
  }
  return inserted
}

async function main() {
  console.log("Migrating February competition data to february_* tables\n")

  // 1. Competition users — entire table is Feb data
  console.log("1. february_competition_users...")
  const users = data.competition_users.map((u: any) => ({
    id: u.id,
    generated_password: u.generated_password,
    username: u.username,
    session_token: u.session_token,
    first_login_at: u.first_login_at,
    solved_at: u.solved_at,
    total_passcode_attempts: u.total_passcode_attempts,
    total_chat_messages: u.total_chat_messages,
    total_hint_clicks: u.total_hint_clicks,
    is_solved: u.is_solved,
    created_at: u.created_at,
  }))
  const usersInserted = await insertBatch("february_competition_users", users)
  console.log(`   ${usersInserted} rows`)

  // 2. Chat sessions — filter by challenge_id = competition-001
  console.log("2. february_chat_sessions...")
  const febSessions = data.chat_sessions.filter((s: any) => s.challenge_id === FEB_CHALLENGE_ID)
  const sessionsData = febSessions.map((s: any) => ({
    id: s.id,
    challenge_id: s.challenge_id,
    session_hash: s.session_hash,
    user_ip: s.user_ip,
    user_id: s.user_id,
    started_at: s.started_at,
    last_activity_at: s.last_activity_at,
    message_count: s.message_count,
    completed: s.completed,
    completed_at: s.completed_at,
    completion_time_seconds: s.completion_time_seconds,
  }))
  const sessionsInserted = await insertBatch("february_chat_sessions", sessionsData)
  console.log(`   ${sessionsInserted} rows (filtered from ${data.chat_sessions.length} total)`)

  // 3. Chat messages — those linked to Feb sessions
  console.log("3. february_chat_messages...")
  const febSessionIds = new Set(febSessions.map((s: any) => s.id))
  const febMessages = data.chat_messages.filter((m: any) => febSessionIds.has(m.session_id))
  const messagesData = febMessages.map((m: any) => ({
    id: m.id,
    session_id: m.session_id,
    user_message: m.user_message,
    assistant_response: m.assistant_response,
    created_at: m.created_at,
    response_time_ms: m.response_time_ms,
  }))
  const messagesInserted = await insertBatch("february_chat_messages", messagesData)
  console.log(`   ${messagesInserted} rows (filtered from ${data.chat_messages.length} total)`)

  // 4. Failed attempts — filter by challenge_id = competition-001
  console.log("4. february_failed_attempts...")
  const febFails = data.failed_attempts.filter((f: any) => f.challenge_id === FEB_CHALLENGE_ID)
  const failsData = febFails.map((f: any) => ({
    id: f.id,
    session_hash: f.session_hash,
    challenge_id: f.challenge_id,
    attempted_secret: f.attempted_secret,
    user_id: f.user_id,
    created_at: f.created_at,
  }))
  const failsInserted = await insertBatch("february_failed_attempts", failsData)
  console.log(`   ${failsInserted} rows (filtered from ${data.failed_attempts.length} total)`)

  // 5. Hint clicks — filter by challenge_id = competition-001
  console.log("5. february_hint_clicks...")
  const febHints = data.hint_clicks.filter((h: any) => h.challenge_id === FEB_CHALLENGE_ID)
  const hintsData = febHints.map((h: any) => ({
    id: h.id,
    session_hash: h.session_hash,
    challenge_id: h.challenge_id,
    user_id: h.user_id,
    clicked_at: h.clicked_at,
  }))
  const hintsInserted = await insertBatch("february_hint_clicks", hintsData)
  console.log(`   ${hintsInserted} rows (filtered from ${data.hint_clicks.length} total)`)

  // 6. User session links — entire table is Feb data
  console.log("6. february_user_session_links...")
  const linksData = data.user_session_links.map((l: any) => ({
    id: l.id,
    user_id: l.user_id,
    session_hash: l.session_hash,
    linked_at: l.linked_at,
  }))
  const linksInserted = await insertBatch("february_user_session_links", linksData)
  console.log(`   ${linksInserted} rows`)

  console.log("\nMigration complete.")
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})

/**
 * Investigate all data remaining in shared (non-february, non-march) tables.
 * Identifies what each challenge_id is and whether any competition data leaked.
 *
 * Usage: npx tsx scripts/_investigate_remaining.ts
 */

import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { gunzipSync } from "zlib"

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = resolve(__dirname, "../.env.local")
const envContent = readFileSync(envPath, "utf-8")
const env: Record<string, string> = {}
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) env[match[1].trim()] = match[2].trim()
}

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
const SERVICE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"]
const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
}

async function getAll(table: string): Promise<any[]> {
  const allRows: any[] = []
  let offset = 0
  const pageSize = 1000
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: { ...HEADERS, Range: `${offset}-${offset + pageSize - 1}` },
    })
    if (!res.ok) throw new Error(`GET ${table} failed: ${res.status}`)
    const rows = await res.json()
    allRows.push(...rows)
    if (rows.length < pageSize) break
    offset += pageSize
  }
  return allRows
}

const FEB_CHALLENGE = "competition-001"

async function main() {
  const sessions = await getAll("chat_sessions")
  const messages = await getAll("chat_messages")
  const fails = await getAll("failed_attempts")
  const hints = await getAll("hint_clicks")
  const users = await getAll("users")
  const leaderboard = await getAll("leaderboard")
  const playerProgress = await getAll("player_progress")
  const activeChallenge = await getAll("active_challenge")
  const emailSubs = await getAll("email_subscriptions")
  const compUsers = await getAll("competition_users")
  const sessionLinks = await getAll("user_session_links")

  // Separate Feb vs non-Feb
  const febSessions = sessions.filter((s: any) => s.challenge_id === FEB_CHALLENGE)
  const nonFebSessions = sessions.filter((s: any) => s.challenge_id !== FEB_CHALLENGE)
  const febSessionIds = new Set(febSessions.map((s: any) => s.id))
  const nonFebSessionIds = new Set(nonFebSessions.map((s: any) => s.id))

  const febMessages = messages.filter((m: any) => febSessionIds.has(m.session_id))
  const nonFebMessages = messages.filter((m: any) => nonFebSessionIds.has(m.session_id))
  const orphanMessages = messages.filter((m: any) => !febSessionIds.has(m.session_id) && !nonFebSessionIds.has(m.session_id))

  console.log("=== SHARED TABLE BREAKDOWN ===\n")

  console.log("--- chat_sessions by challenge_id ---")
  const sessionsByChallengeId: Record<string, any[]> = {}
  for (const s of sessions) {
    const cid = s.challenge_id
    if (!sessionsByChallengeId[cid]) sessionsByChallengeId[cid] = []
    sessionsByChallengeId[cid].push(s)
  }
  for (const [cid, arr] of Object.entries(sessionsByChallengeId)) {
    const dates = arr.map((s: any) => s.started_at?.substring(0, 10)).sort()
    console.log(`  ${cid}: ${arr.length} sessions (${dates[0]} to ${dates[dates.length - 1]})`)
  }

  console.log(`\n--- chat_messages breakdown ---`)
  console.log(`  Feb competition (competition-001): ${febMessages.length}`)
  console.log(`  Non-Feb (v0 site challenges): ${nonFebMessages.length}`)
  console.log(`  Orphans (no matching session): ${orphanMessages.length}`)

  if (orphanMessages.length > 0) {
    console.log(`\n  ORPHAN MESSAGES (session_id doesn't match any session):`)
    for (const m of orphanMessages) {
      console.log(`    id=${m.id} session_id=${m.session_id} created=${m.created_at}`)
      console.log(`      user: "${m.user_message.substring(0, 80)}..."`)
      console.log(`      assistant: "${m.assistant_response.substring(0, 80)}..."`)
    }
  }

  // Non-Feb messages grouped by challenge
  console.log(`\n--- Non-Feb messages by challenge_id ---`)
  const msgByChallenge: Record<string, number> = {}
  for (const m of nonFebMessages) {
    const session = nonFebSessions.find((s: any) => s.id === m.session_id)
    const cid = session?.challenge_id || "unknown"
    msgByChallenge[cid] = (msgByChallenge[cid] || 0) + 1
  }
  for (const [cid, count] of Object.entries(msgByChallenge)) {
    console.log(`  ${cid}: ${count} messages`)
  }

  console.log(`\n--- failed_attempts by challenge_id ---`)
  const failsByCid: Record<string, number> = {}
  for (const f of fails) {
    failsByCid[f.challenge_id] = (failsByCid[f.challenge_id] || 0) + 1
  }
  for (const [cid, count] of Object.entries(failsByCid)) {
    console.log(`  ${cid}: ${count}`)
  }

  console.log(`\n--- hint_clicks by challenge_id ---`)
  const hintsByCid: Record<string, number> = {}
  for (const h of hints) {
    hintsByCid[h.challenge_id] = (hintsByCid[h.challenge_id] || 0) + 1
  }
  for (const [cid, count] of Object.entries(hintsByCid)) {
    console.log(`  ${cid}: ${count}`)
  }

  // Check for competition-like content in non-Feb messages
  console.log(`\n--- Scanning non-Feb messages for competition keywords ---`)
  const competitionKeywords = ["ramfree", "kuponkód", "kupon", "bulif0t0k", "család és barátok", "ramtastic", "ramóna"]
  let compLikeCount = 0
  for (const m of nonFebMessages) {
    const text = (m.user_message + " " + m.assistant_response).toLowerCase()
    const matches = competitionKeywords.filter((k) => text.includes(k))
    if (matches.length > 0) {
      compLikeCount++
      const session = nonFebSessions.find((s: any) => s.id === m.session_id)
      console.log(`  MATCH in challenge=${session?.challenge_id} created=${m.created_at}`)
      console.log(`    keywords: ${matches.join(", ")}`)
      console.log(`    user: "${m.user_message.substring(0, 100)}..."`)
      console.log(`    assistant: "${m.assistant_response.substring(0, 100)}..."`)
      console.log()
    }
  }
  if (compLikeCount === 0) console.log(`  None found.`)
  else console.log(`  ${compLikeCount} messages with competition-like content in non-Feb sessions`)

  console.log(`\n--- Other tables (v0 site specific) ---`)
  console.log(`  users: ${users.length} (registered site accounts)`)
  console.log(`  leaderboard: ${leaderboard.length} entries`)
  console.log(`  player_progress: ${playerProgress.length} entries`)
  console.log(`  active_challenge: ${activeChallenge.length} entries`)
  console.log(`  email_subscriptions: ${emailSubs.length} entries`)
  console.log(`  competition_users: ${compUsers.length} (Feb competition passwords)`)
  console.log(`  user_session_links: ${sessionLinks.length} (Feb competition session links)`)

  console.log(`\n--- Leaderboard detail ---`)
  for (const l of leaderboard) {
    console.log(`  ${l.username} | challenge=${l.challenge_id} | time=${l.completion_time_seconds}s`)
  }

  console.log(`\n--- active_challenge detail ---`)
  for (const a of activeChallenge) {
    console.log(`  challenge_id=${a.challenge_id} active=${a.is_active} activated=${a.activated_at?.substring(0, 10)}`)
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Tables that are 100% Feb competition data (can be cleaned after migration):`)
  console.log(`  competition_users: ${compUsers.length} rows`)
  console.log(`  user_session_links: ${sessionLinks.length} rows`)
  console.log(`Tables with mixed data:`)
  console.log(`  chat_sessions: ${febSessions.length} Feb + ${nonFebSessions.length} v0 site`)
  console.log(`  chat_messages: ${febMessages.length} Feb + ${nonFebMessages.length} v0 site + ${orphanMessages.length} orphans`)
  console.log(`  failed_attempts: ${failsByCid[FEB_CHALLENGE] || 0} Feb + ${Object.entries(failsByCid).filter(([k]) => k !== FEB_CHALLENGE).reduce((s, [, v]) => s + v, 0)} v0 site`)
  console.log(`  hint_clicks: ${hintsByCid[FEB_CHALLENGE] || 0} Feb + ${Object.entries(hintsByCid).filter(([k]) => k !== FEB_CHALLENGE).reduce((s, [, v]) => s + v, 0)} v0 site`)
  console.log(`Tables that are 100% v0 site data:`)
  console.log(`  users: ${users.length}`)
  console.log(`  leaderboard: ${leaderboard.length}`)
  console.log(`  player_progress: ${playerProgress.length}`)
  console.log(`  active_challenge: ${activeChallenge.length}`)
  console.log(`  email_subscriptions: ${emailSubs.length}`)
}

main().catch((err) => {
  console.error("Investigation failed:", err)
  process.exit(1)
})

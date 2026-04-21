/**
 * Verify February migration: compare source (shared tables) vs destination (february_* tables)
 * and backup file. Ensures row counts, IDs, and data integrity match exactly.
 *
 * Usage: npx tsx scripts/_verify_february.ts
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

const FEB_CHALLENGE_ID = "competition-001"
let errors = 0

function check(label: string, expected: any, actual: any) {
  const pass = expected === actual
  console.log(`  ${pass ? "PASS" : "FAIL"} ${label}: expected=${expected}, actual=${actual}`)
  if (!pass) errors++
}

function checkSetsEqual(label: string, setA: Set<string>, setB: Set<string>) {
  const missing = [...setA].filter((x) => !setB.has(x))
  const extra = [...setB].filter((x) => !setA.has(x))
  const pass = missing.length === 0 && extra.length === 0
  console.log(`  ${pass ? "PASS" : "FAIL"} ${label}: ${setA.size} vs ${setB.size} IDs`)
  if (missing.length > 0) console.log(`    Missing: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "..." : ""}`)
  if (extra.length > 0) console.log(`    Extra: ${extra.slice(0, 5).join(", ")}${extra.length > 5 ? "..." : ""}`)
  if (!pass) errors++
}

async function main() {
  console.log("=== VERIFICATION: February Migration ===\n")

  // 1. Fetch source data (shared tables)
  console.log("Fetching source tables (shared)...")
  const srcUsers = await getAll("competition_users")
  const srcSessions = await getAll("chat_sessions")
  const srcMessages = await getAll("chat_messages")
  const srcFails = await getAll("failed_attempts")
  const srcHints = await getAll("hint_clicks")
  const srcLinks = await getAll("user_session_links")

  // Filter source for Feb competition
  const srcFebSessions = srcSessions.filter((s: any) => s.challenge_id === FEB_CHALLENGE_ID)
  const srcFebSessionIds = new Set(srcFebSessions.map((s: any) => s.id))
  const srcFebMessages = srcMessages.filter((m: any) => srcFebSessionIds.has(m.session_id))
  const srcFebFails = srcFails.filter((f: any) => f.challenge_id === FEB_CHALLENGE_ID)
  const srcFebHints = srcHints.filter((h: any) => h.challenge_id === FEB_CHALLENGE_ID)

  // 2. Fetch destination data (february_* tables)
  console.log("Fetching destination tables (february_*)...")
  const dstUsers = await getAll("february_competition_users")
  const dstSessions = await getAll("february_chat_sessions")
  const dstMessages = await getAll("february_chat_messages")
  const dstFails = await getAll("february_failed_attempts")
  const dstHints = await getAll("february_hint_clicks")
  const dstLinks = await getAll("february_user_session_links")

  // 3. Load backup file
  console.log("Loading backup file...")
  const backup = JSON.parse(
    gunzipSync(readFileSync(resolve(__dirname, "../data/db-export/february-competition-backup.json.gz"))).toString()
  )

  console.log("\n--- Row count comparison: Source vs Destination vs Backup ---\n")

  // competition_users — entire table
  check("competition_users count (src vs dst)", srcUsers.length, dstUsers.length)
  check("competition_users count (dst vs backup)", dstUsers.length, backup.february_competition_users.length)

  // chat_sessions — filtered
  check("chat_sessions count (src_filtered vs dst)", srcFebSessions.length, dstSessions.length)
  check("chat_sessions count (dst vs backup)", dstSessions.length, backup.february_chat_sessions.length)

  // chat_messages — filtered
  check("chat_messages count (src_filtered vs dst)", srcFebMessages.length, dstMessages.length)
  check("chat_messages count (dst vs backup)", dstMessages.length, backup.february_chat_messages.length)

  // failed_attempts — filtered
  check("failed_attempts count (src_filtered vs dst)", srcFebFails.length, dstFails.length)
  check("failed_attempts count (dst vs backup)", dstFails.length, backup.february_failed_attempts.length)

  // hint_clicks — filtered
  check("hint_clicks count (src_filtered vs dst)", srcFebHints.length, dstHints.length)
  check("hint_clicks count (dst vs backup)", dstHints.length, backup.february_hint_clicks.length)

  // user_session_links — entire table
  check("user_session_links count (src vs dst)", srcLinks.length, dstLinks.length)
  check("user_session_links count (dst vs backup)", dstLinks.length, backup.february_user_session_links.length)

  console.log("\n--- ID integrity: Source IDs == Destination IDs ---\n")

  checkSetsEqual("competition_users IDs",
    new Set(srcUsers.map((u: any) => u.id)),
    new Set(dstUsers.map((u: any) => u.id)))

  checkSetsEqual("chat_sessions IDs",
    new Set(srcFebSessions.map((s: any) => s.id)),
    new Set(dstSessions.map((s: any) => s.id)))

  checkSetsEqual("chat_messages IDs",
    new Set(srcFebMessages.map((m: any) => m.id)),
    new Set(dstMessages.map((m: any) => m.id)))

  checkSetsEqual("failed_attempts IDs",
    new Set(srcFebFails.map((f: any) => f.id)),
    new Set(dstFails.map((f: any) => f.id)))

  checkSetsEqual("hint_clicks IDs",
    new Set(srcFebHints.map((h: any) => h.id)),
    new Set(dstHints.map((h: any) => h.id)))

  checkSetsEqual("user_session_links IDs",
    new Set(srcLinks.map((l: any) => l.id)),
    new Set(dstLinks.map((l: any) => l.id)))

  console.log("\n--- Data spot-checks ---\n")

  // Check a few user fields match exactly
  const srcUserMap = new Map(srcUsers.map((u: any) => [u.id, u]))
  let userFieldErrors = 0
  for (const du of dstUsers) {
    const su = srcUserMap.get(du.id)
    if (!su) { userFieldErrors++; continue }
    if (su.generated_password !== du.generated_password) userFieldErrors++
    if (su.username !== du.username) userFieldErrors++
    if (su.is_solved !== du.is_solved) userFieldErrors++
    if (su.total_chat_messages !== du.total_chat_messages) userFieldErrors++
    if (su.total_passcode_attempts !== du.total_passcode_attempts) userFieldErrors++
  }
  check("competition_users field-level mismatches", 0, userFieldErrors)

  // Check messages: verify session_id FK integrity
  const dstSessionIds = new Set(dstSessions.map((s: any) => s.id))
  const orphanMessages = dstMessages.filter((m: any) => !dstSessionIds.has(m.session_id))
  check("chat_messages orphans (no matching session)", 0, orphanMessages.length)

  // Check links: verify user_id FK integrity
  const dstUserIds = new Set(dstUsers.map((u: any) => u.id))
  const orphanLinks = dstLinks.filter((l: any) => !dstUserIds.has(l.user_id))
  check("user_session_links orphans (no matching user)", 0, orphanLinks.length)

  // Verify no non-Feb sessions leaked in
  const nonFebSessions = dstSessions.filter((s: any) => s.challenge_id !== FEB_CHALLENGE_ID)
  check("non-competition-001 sessions in february_chat_sessions", 0, nonFebSessions.length)

  const nonFebFails = dstFails.filter((f: any) => f.challenge_id !== FEB_CHALLENGE_ID)
  check("non-competition-001 in february_failed_attempts", 0, nonFebFails.length)

  const nonFebHints = dstHints.filter((h: any) => h.challenge_id !== FEB_CHALLENGE_ID)
  check("non-competition-001 in february_hint_clicks", 0, nonFebHints.length)

  // Summary stats
  const solvedSrc = srcUsers.filter((u: any) => u.is_solved).length
  const solvedDst = dstUsers.filter((u: any) => u.is_solved).length
  check("solved users count match", solvedSrc, solvedDst)

  console.log("\n=== RESULT ===\n")
  if (errors === 0) {
    console.log("ALL CHECKS PASSED. Migration and backup verified.\n")
  } else {
    console.log(`${errors} CHECK(S) FAILED. Review above.\n`)
  }
}

main().catch((err) => {
  console.error("Verification failed:", err)
  process.exit(1)
})

/**
 * Analyzes the v0 Prompt The Flag backup to show date distribution
 * and data breakdown across all tables. Useful for identifying
 * which data belongs to the February competition vs the v0 site.
 *
 * Usage: npx tsx scripts/_analyze-v0.ts
 */

import { gunzipSync } from "zlib"
import { readFileSync } from "fs"

import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
const __dirname = dirname(fileURLToPath(import.meta.url))

const data = JSON.parse(
  gunzipSync(readFileSync(resolve(__dirname, "../../v0-prompt-the-flag/data/db-backup/full-backup-2026-03-21T15-52-07.json.gz"))).toString()
)

console.log("=== competition_users: date range ===")
const users = data.competition_users
const loginDates = users.filter((u: any) => u.first_login_at).map((u: any) => u.first_login_at).sort()
console.log("  Total:", users.length)
console.log("  Earliest login:", loginDates[0])
console.log("  Latest login:", loginDates[loginDates.length - 1])

const byDate: Record<string, number> = {}
for (const u of users) {
  if (!u.first_login_at) {
    byDate["no_login"] = (byDate["no_login"] || 0) + 1
    continue
  }
  const d = u.first_login_at.substring(0, 10)
  byDate[d] = (byDate[d] || 0) + 1
}
console.log("  By date:", JSON.stringify(byDate, null, 2))

console.log("\n=== chat_sessions: date range ===")
const sessions = data.chat_sessions
const sessionDates: Record<string, number> = {}
for (const s of sessions) {
  const d = s.started_at.substring(0, 10)
  sessionDates[d] = (sessionDates[d] || 0) + 1
}
console.log("  Total:", sessions.length)
console.log("  By date:", JSON.stringify(sessionDates, null, 2))

const challengeIds = new Set(sessions.map((s: any) => s.challenge_id))
console.log("  Challenge IDs:", [...challengeIds])

console.log("\n=== chat_messages: date range ===")
const msgs = data.chat_messages
const msgDates: Record<string, number> = {}
for (const m of msgs) {
  const d = m.created_at.substring(0, 10)
  msgDates[d] = (msgDates[d] || 0) + 1
}
console.log("  Total:", msgs.length)
console.log("  By date:", JSON.stringify(msgDates, null, 2))

console.log("\n=== failed_attempts: date range ===")
const fails = data.failed_attempts
const failDates: Record<string, number> = {}
for (const f of fails) {
  const d = f.created_at.substring(0, 10)
  failDates[d] = (failDates[d] || 0) + 1
}
console.log("  Total:", fails.length)
console.log("  By date:", JSON.stringify(failDates, null, 2))

console.log("\n=== hint_clicks: date range ===")
const hints = data.hint_clicks
const hintDates: Record<string, number> = {}
for (const h of hints) {
  const d = h.clicked_at.substring(0, 10)
  hintDates[d] = (hintDates[d] || 0) + 1
}
console.log("  Total:", hints.length)
console.log("  By date:", JSON.stringify(hintDates, null, 2))

console.log("\n=== users table ===")
console.log("  Total:", data.users.length)
for (const u of data.users) {
  console.log(" ", u.id, u.email || u.username, u.created_at?.substring(0, 10))
}

console.log("\n=== active_challenge ===")
for (const a of data.active_challenge) {
  console.log(" ", JSON.stringify(a))
}

console.log("\n=== leaderboard ===")
console.log("  Total:", data.leaderboard.length)
for (const l of data.leaderboard) {
  console.log(" ", l.username, l.challenge_id, l.completed_at?.substring(0, 10))
}

console.log("\n=== player_progress ===")
console.log("  Total:", data.player_progress.length)
for (const p of data.player_progress) {
  console.log(" ", p.user_id, p.challenge_id, p.completed ? "completed" : "incomplete")
}

console.log("\n=== user_session_links ===")
console.log("  Total:", data.user_session_links.length)
const linkDates: Record<string, number> = {}
for (const l of data.user_session_links) {
  const d = l.linked_at.substring(0, 10)
  linkDates[d] = (linkDates[d] || 0) + 1
}
console.log("  By date:", JSON.stringify(linkDates, null, 2))

console.log("\n=== email_subscriptions ===")
console.log("  Total:", data.email_subscriptions.length)
const emailDates: Record<string, number> = {}
for (const e of data.email_subscriptions) {
  const d = e.created_at.substring(0, 10)
  emailDates[d] = (emailDates[d] || 0) + 1
}
console.log("  By date:", JSON.stringify(emailDates, null, 2))

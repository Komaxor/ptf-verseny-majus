/**
 * Add competition users with email to march_competition_users
 *
 * Usage:
 *   npx tsx scripts/add-users-with-email.ts --file users.tsv
 *
 * File format: tab-separated, one per line: email\tpassword
 */

import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
}

interface UserEntry {
  email: string
  generated_password: string
}

async function insertUsers(users: UserEntry[]): Promise<void> {
  const chunkSize = 100
  let inserted = 0

  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/march_competition_users`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(chunk),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`Insert failed (${res.status}):`, body)
      process.exit(1)
    }

    const data = await res.json()
    inserted += data.length
  }

  console.log(`\nInserted ${inserted} user(s) into march_competition_users`)
}

async function main() {
  const args = process.argv.slice(2)

  if (args[0] !== "--file" || !args[1]) {
    console.error("Usage: npx tsx scripts/add-users-with-email.ts --file <path>")
    process.exit(1)
  }

  const filePath = resolve(args[1])
  const content = readFileSync(filePath, "utf-8")
  const users: UserEntry[] = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line) => {
      const [email, password] = line.split("\t")
      if (!email || !password) {
        console.error(`Invalid line (expected tab-separated email\\tpassword): "${line}"`)
        process.exit(1)
      }
      return { email: email.trim(), generated_password: password.trim() }
    })

  console.log(`Read ${users.length} users from ${filePath}`)

  // Check for duplicate passwords
  const passwords = users.map((u) => u.generated_password)
  const unique = new Set(passwords)
  if (unique.size < passwords.length) {
    console.error(`Error: ${passwords.length - unique.size} duplicate password(s) found`)
    process.exit(1)
  }

  await insertUsers(users)

  // Show current total
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/march_competition_users?select=id`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: "count=exact",
        Range: "0-0",
      },
    }
  )
  const range = countRes.headers.get("content-range") || ""
  const total = range.split("/")[1]
  console.log(`Total users in march_competition_users: ${total}`)
}

main().catch((err) => {
  console.error("Failed:", err)
  process.exit(1)
})

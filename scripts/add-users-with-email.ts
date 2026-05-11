/**
 * Add competition users from a CSV file. Reusable across monthly forks.
 *
 * Usage:
 *   npx tsx scripts/add-users-with-email.ts \
 *     --table may_competition_users \
 *     --file data/users.csv \
 *     [--output data/users.with-passwords.csv]
 *
 * CSV format (header row optional, auto-detected):
 *
 *   1) Email only — passwords auto-generated:
 *      email
 *      alice@example.com
 *      bob@example.com
 *
 *   2) Email + password — passwords used as-is (legacy / hand-rolled):
 *      email,password
 *      alice@example.com,9CHARPASS
 *      bob@example.com,OTHER9PWD
 *
 * The script:
 *   - Loads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
 *   - Generates 9-char alphanumeric passwords for any rows missing one
 *     (alphabet skips ambiguous chars: 0/O/1/I)
 *   - Bulk-inserts to the table you pass via --table, in chunks of 100
 *   - Fails before insert if any duplicate password is detected
 *   - Prints final email,password pairs to stdout (CSV) so you can mail them
 *   - If --output is set, also writes the CSV to that file
 */

import { readFileSync, writeFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { randomBytes } from "crypto"

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

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const PASSWORD_LEN = 9

function generatePassword(): string {
  const bytes = randomBytes(PASSWORD_LEN)
  let out = ""
  for (let i = 0; i < PASSWORD_LEN; i++) {
    out += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length]
  }
  return out
}

function parseArgs(): { table: string; file: string; output: string | null } {
  const args = process.argv.slice(2)
  let table: string | null = null
  let file: string | null = null
  let output: string | null = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--table") table = args[++i] ?? null
    else if (args[i] === "--file") file = args[++i] ?? null
    else if (args[i] === "--output") output = args[++i] ?? null
    else {
      console.error(`Unknown arg: ${args[i]}`)
      process.exit(1)
    }
  }
  if (!table || !file) {
    console.error("Usage: npx tsx scripts/add-users-with-email.ts --table <table> --file <csv> [--output <csv>]")
    process.exit(1)
  }
  if (!/^[a-z][a-z0-9_]*$/.test(table)) {
    console.error(`Invalid --table value: "${table}". Must be a plain SQL identifier (e.g. may_competition_users).`)
    process.exit(1)
  }
  return { table, file, output }
}

function parseCsv(path: string): UserEntry[] {
  const content = readFileSync(path, "utf-8")
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) {
    console.error(`File is empty: ${path}`)
    process.exit(1)
  }

  let startIdx = 0
  const firstLineLower = lines[0].toLowerCase()
  if (firstLineLower === "email" || firstLineLower.startsWith("email,")) {
    startIdx = 1
  }

  const users: UserEntry[] = []
  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(",").map((s) => s.trim())
    const email = parts[0]
    if (!email || !email.includes("@")) {
      console.error(`Line ${i + 1}: invalid email "${parts[0]}"`)
      process.exit(1)
    }
    let password = parts[1]
    if (!password) password = generatePassword()
    users.push({ email, generated_password: password })
  }

  return users
}

async function insertUsers(table: string, users: UserEntry[]): Promise<void> {
  const chunkSize = 100
  let inserted = 0

  for (let i = 0; i < users.length; i += chunkSize) {
    const chunk = users.slice(i, i + chunkSize)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
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

  console.log(`Inserted ${inserted} user(s) into ${table}`)
}

async function main() {
  const { table, file, output } = parseArgs()

  const users = parseCsv(file)
  console.log(`Read ${users.length} users from ${file}`)

  const passwords = users.map((u) => u.generated_password)
  const unique = new Set(passwords)
  if (unique.size < passwords.length) {
    console.error(`Error: ${passwords.length - unique.size} duplicate password(s) found in input`)
    process.exit(1)
  }

  await insertUsers(table, users)

  const csv = "email,password\n" + users.map((u) => `${u.email},${u.generated_password}`).join("\n") + "\n"
  if (output) {
    writeFileSync(output, csv)
    console.log(`Wrote ${users.length} email,password pairs to ${output}`)
  } else {
    console.log("\n--- email,password (distribute to participants) ---")
    process.stdout.write(csv)
  }

  const countRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  })
  const range = countRes.headers.get("content-range") || ""
  const total = range.split("/")[1]
  console.log(`Total users in ${table}: ${total}`)
}

main().catch((err) => {
  console.error("Failed:", err)
  process.exit(1)
})

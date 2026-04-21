/**
 * Add competition users to march_competition_users
 *
 * Usage:
 *   # Single user with auto-generated password
 *   npx tsx scripts/add-users.ts
 *
 *   # Single user with specific password
 *   npx tsx scripts/add-users.ts "mypassword123"
 *
 *   # Bulk: generate N users with random passwords
 *   npx tsx scripts/add-users.ts --bulk 50
 *
 *   # Bulk: import from file (one password per line)
 *   npx tsx scripts/add-users.ts --file passwords.txt
 */

import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { randomBytes } from "crypto"

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

function generatePassword(): string {
  // 8 chars, alphanumeric, easy to type/read (no ambiguous chars)
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"
  const bytes = randomBytes(8)
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("")
}

async function insertUsers(passwords: string[]): Promise<void> {
  const rows = passwords.map((p) => ({ generated_password: p }))

  // Batch in chunks of 100
  const chunkSize = 100
  let inserted = 0

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
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

  let passwords: string[] = []

  if (args[0] === "--bulk") {
    const count = parseInt(args[1], 10)
    if (!count || count < 1) {
      console.error("Usage: --bulk <number>")
      process.exit(1)
    }
    passwords = Array.from({ length: count }, () => generatePassword())
    console.log(`Generating ${count} random passwords...`)
  } else if (args[0] === "--file") {
    const filePath = resolve(args[1] || "")
    if (!args[1]) {
      console.error("Usage: --file <path>")
      process.exit(1)
    }
    const content = readFileSync(filePath, "utf-8")
    passwords = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    console.log(`Read ${passwords.length} passwords from ${filePath}`)
  } else if (args.length > 0) {
    // Single password provided
    passwords = [args[0].trim()]
  } else {
    // No args: generate one
    passwords = [generatePassword()]
    console.log("No password provided, generating one...")
  }

  // Check for duplicates in input
  const unique = new Set(passwords)
  if (unique.size < passwords.length) {
    console.error(`Warning: ${passwords.length - unique.size} duplicate(s) removed`)
    passwords = [...unique]
  }

  await insertUsers(passwords)

  // Print passwords
  if (passwords.length <= 20) {
    console.log("\nPasswords:")
    passwords.forEach((p) => console.log(`  ${p}`))
  } else {
    console.log(`\nFirst 10 passwords:`)
    passwords.slice(0, 10).forEach((p) => console.log(`  ${p}`))
    console.log(`  ... and ${passwords.length - 10} more`)
    // Write full list to file
    const outPath = resolve(__dirname, "../data/march-passwords.txt")
    const { writeFileSync, mkdirSync } = await import("fs")
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, passwords.join("\n") + "\n", "utf-8")
    console.log(`\nFull list saved to: ${outPath}`)
  }

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
  console.log(`\nTotal users in march_competition_users: ${total}`)
}

main().catch((err) => {
  console.error("Failed:", err)
  process.exit(1)
})

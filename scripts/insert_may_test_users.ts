/**
 * One-off: insert 20 test users into may_competition_users.
 * Mirrors scripts/insert_may_test_users.sql.
 *
 * Usage: npx tsx scripts/insert_may_test_users.ts
 */

import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

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
  Prefer: "return=representation,resolution=merge-duplicates",
}

const USERS: { email: string; generated_password: string }[] = [
  { email: "teszt01@promptverseny.hu", generated_password: "G5E62P3EA" },
  { email: "teszt02@promptverseny.hu", generated_password: "WZ6VADHV2" },
  { email: "teszt03@promptverseny.hu", generated_password: "HSRLJWHKT" },
  { email: "teszt04@promptverseny.hu", generated_password: "UA5PMMUD6" },
  { email: "teszt05@promptverseny.hu", generated_password: "LB7WVF3CR" },
  { email: "teszt06@promptverseny.hu", generated_password: "7WSEZJ7WP" },
  { email: "teszt07@promptverseny.hu", generated_password: "Y4NJNCQLU" },
  { email: "teszt08@promptverseny.hu", generated_password: "TUHHDXZWZ" },
  { email: "teszt09@promptverseny.hu", generated_password: "PL4BHUQK7" },
  { email: "teszt10@promptverseny.hu", generated_password: "3X3JJ9XTD" },
  { email: "teszt11@promptverseny.hu", generated_password: "TZ9JP2ETK" },
  { email: "teszt12@promptverseny.hu", generated_password: "TVRMB7F5Q" },
  { email: "teszt13@promptverseny.hu", generated_password: "Z4RQC9HT6" },
  { email: "teszt14@promptverseny.hu", generated_password: "EJFPQ2Y5A" },
  { email: "teszt15@promptverseny.hu", generated_password: "29C59EWP7" },
  { email: "teszt16@promptverseny.hu", generated_password: "YZ2F47NDV" },
  { email: "teszt17@promptverseny.hu", generated_password: "DF78W5JXD" },
  { email: "teszt18@promptverseny.hu", generated_password: "XWLZN5B2C" },
  { email: "teszt19@promptverseny.hu", generated_password: "LB46Q9F5S" },
  { email: "teszt20@promptverseny.hu", generated_password: "7QNWQU66E" },
]

async function main() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/may_competition_users`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(USERS),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`Insert failed (${res.status}):`, body)
    process.exit(1)
  }

  const data = await res.json()
  console.log(`Inserted ${data.length} row(s).`)

  // Verify
  const verifyRes = await fetch(
    `${SUPABASE_URL}/rest/v1/may_competition_users?select=email,generated_password&order=email.asc`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )
  const all = await verifyRes.json()
  console.log(`\nTotal rows in may_competition_users: ${all.length}`)
  console.log("First 5:")
  for (const u of all.slice(0, 5)) console.log(`  ${u.email}  ${u.generated_password}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

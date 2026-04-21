/**
 * Backup february_* competition tables to compressed .json.gz
 *
 * Usage: npx tsx scripts/032_backup_february.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { gzipSync } from "zlib"

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
}

const TABLES = [
  "february_competition_users",
  "february_chat_sessions",
  "february_chat_messages",
  "february_failed_attempts",
  "february_hint_clicks",
  "february_user_session_links",
]

async function getAll(table: string): Promise<any[]> {
  const allRows: any[] = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*`
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
  console.log("February competition backup — read-only\n")

  const backup: Record<string, any> = {
    _meta: {
      created_at: new Date().toISOString(),
      supabase_url: SUPABASE_URL,
      competition: "february-2026",
      tables: TABLES,
    },
  }

  let totalRows = 0
  for (const table of TABLES) {
    process.stdout.write(`  ${table}...`)
    const rows = await getAll(table)
    backup[table] = rows
    totalRows += rows.length
    console.log(` ${rows.length} rows`)
  }

  const json = JSON.stringify(backup, null, 2)
  const compressed = gzipSync(Buffer.from(json))

  const outDir = resolve(__dirname, "../data/db-export")
  mkdirSync(outDir, { recursive: true })

  const outPath = resolve(outDir, "february-competition-backup.json.gz")
  writeFileSync(outPath, compressed)

  const jsonSizeKB = (Buffer.byteLength(json) / 1024).toFixed(1)
  const gzSizeKB = (compressed.length / 1024).toFixed(1)

  console.log(`\nBackup complete: ${outPath}`)
  console.log(`  Tables: ${TABLES.length}`)
  console.log(`  Total rows: ${totalRows}`)
  console.log(`  JSON: ${jsonSizeKB} KB → gzip: ${gzSizeKB} KB (${((1 - compressed.length / Buffer.byteLength(json)) * 100).toFixed(0)}% reduction)`)
}

main().catch((err) => {
  console.error("Backup failed:", err)
  process.exit(1)
})

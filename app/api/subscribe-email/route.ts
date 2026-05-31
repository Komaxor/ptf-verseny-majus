import { createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const VALID_SOURCES = ["post_completion", "competition_registration", "challenge_submission", "closed_preregistration"]

const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY
const MAILERLITE_GROUP_ID = process.env.MAILERLITE_GROUP_ID

async function addToMailerLite(email: string) {
  if (!MAILERLITE_API_KEY || !MAILERLITE_GROUP_ID) {
    console.warn("[MailerLite] Skipping - API key or group ID not configured")
    return
  }

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${MAILERLITE_API_KEY}`,
  }

  try {
    // Upsert the subscriber. IMPORTANT: MailerLite's create/upsert endpoint only
    // applies `groups` when the subscriber is NEW — for an already-existing
    // subscriber the `groups` field is silently ignored. So we capture the id
    // and assign the group explicitly below (works for new and existing alike).
    const upsert = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        groups: [MAILERLITE_GROUP_ID],
      }),
    })

    const upsertData = await upsert.json().catch(() => null)

    if (!upsert.ok && upsert.status !== 409) {
      console.error(`[MailerLite] FAILED to upsert ${email}:`, upsert.status, upsertData)
      return
    }

    // Resolve the subscriber id (fall back to a lookup if the upsert didn't return one).
    let subscriberId = upsertData?.data?.id
    if (!subscriberId) {
      const lookup = await fetch(
        `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(email)}`,
        { headers },
      )
      const lookupData = await lookup.json().catch(() => null)
      subscriberId = lookupData?.data?.id
    }

    if (!subscriberId) {
      console.error(`[MailerLite] Could not resolve subscriber id for ${email}`)
      return
    }

    // Explicitly assign the subscriber to the group.
    const assign = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${MAILERLITE_GROUP_ID}`,
      { method: "POST", headers },
    )

    if (assign.ok) {
      console.log(`[MailerLite] ${email} assigned to group ${MAILERLITE_GROUP_ID}`)
    } else {
      const assignData = await assign.json().catch(() => null)
      console.error(`[MailerLite] FAILED to assign ${email} to group:`, assign.status, assignData)
    }
  } catch (error) {
    console.error(`[MailerLite] FAILED to add ${email}:`, error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, sessionHash, challengeId, source } = body

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    const trimmedEmail = email.trim().toLowerCase()

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json({ success: false, error: "Please enter a valid email address" }, { status: 400 })
    }

    const validatedSource = VALID_SOURCES.includes(source) ? source : "post_completion"

    const supabase = await createServiceClient()

    // Try to insert the email subscription
    const { error } = await supabase.from("email_subscriptions").insert({
      email: trimmedEmail,
      session_hash: sessionHash || null,
      challenge_id: challengeId || null,
      source: validatedSource,
    })

    // Handle duplicate email gracefully - treat as success
    if (error) {
      if (error.code === "23505") {
        // Unique violation - email already exists, still add to MailerLite in case it's missing there
        addToMailerLite(trimmedEmail)
        return NextResponse.json({ success: true, alreadySubscribed: true })
      }
      console.error("Email subscription error:", error)
      return NextResponse.json({ success: false, error: "Failed to subscribe. Please try again." }, { status: 500 })
    }

    // Add to MailerLite (fire and forget - don't block the response)
    addToMailerLite(trimmedEmail)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Email subscription error:", error)
    return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 })
  }
}

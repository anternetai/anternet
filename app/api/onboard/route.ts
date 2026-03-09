import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Simple rate limiter — 3 submissions per IP per hour
const submissions = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = submissions.get(ip)
  if (!entry || now > entry.resetAt) {
    submissions.set(ip, { count: 1, resetAt: now + 3600_000 })
    return false
  }
  entry.count++
  return entry.count > 3
}

function getSupabase() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for onboarding")
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// n8n webhook URL for client onboarding automation
const N8N_WEBHOOK_URL = "https://n8n-production-1286.up.railway.app/webhook/client-onboarding"

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
    }

    const body = await request.json()

    // Transform camelCase to snake_case for Supabase
    const clientData = {
      first_name: body.firstName,
      last_name: body.lastName,
      legal_business_name: body.legalBusinessName,
      business_ein: body.businessEin || null,
      working_hours: body.workingHours,
      business_phone: body.businessPhone,
      street_address: body.streetAddress,
      city: body.city,
      postal_code: body.postalCode,
      state: body.state,
      country: body.country,
      website_url: body.websiteUrl,
      cell_phone_for_notifications: body.cellPhoneForNotifications,
      email_for_notifications: body.emailForNotifications,
      business_email_for_leads: body.businessEmailForLeads,
      advertising_area: body.advertisingArea,
      time_zone: body.timeZone,
      image_sharing_url: body.imageSharingUrl || null,
      onboarding_call_booked: body.onboardingCallBooked === "Yes",
      questions: body.questions || null,
      onboarding_status: "pending",
    }

    // Insert into Supabase
    let clientId = crypto.randomUUID() // Fallback ID if DB is offline

    try {
      const { data, error } = await getSupabase()
        .from("agency_clients")
        .insert(clientData)
        .select()
        .single()

      if (!error && data) {
        clientId = data.id
      } else {
        console.error("Supabase error (continuing anyway):", error)
      }
    } catch (dbError) {
      console.error("Database offline, continuing with demo mode:", dbError)
    }

    // Create company slug for Slack channel
    const companySlug = body.legalBusinessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50)

    // Trigger n8n webhook - must await to prevent Vercel from killing the function early
    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          companyName: body.legalBusinessName,
          companySlug,
          ownerName: `${body.firstName} ${body.lastName}`,
          email: body.emailForNotifications,
          phone: body.cellPhoneForNotifications,
          city: body.city,
          state: body.state,
          timeZone: body.timeZone,
          onboardingCallBooked: body.onboardingCallBooked === "Yes",
        }),
      })
    } catch (webhookError) {
      // Log but don't fail the request if webhook fails
      console.error("n8n webhook error:", webhookError)
    }

    return NextResponse.json({
      success: true,
      clientId,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

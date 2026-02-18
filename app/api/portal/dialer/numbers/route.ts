import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/portal/dialer/numbers - list all numbers in pool
export async function GET() {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()

  const { data: numbers, error } = await admin
    .from("dialer_phone_numbers")
    .select("*")
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ numbers: numbers || [] })
}

// POST /api/portal/dialer/numbers - add a new number to pool
export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { phone_number, friendly_name, area_code, state, twilio_sid, max_calls_per_hour, cooldown_minutes } =
    body as {
      phone_number: string
      friendly_name?: string
      area_code?: string
      state?: string
      twilio_sid?: string
      max_calls_per_hour?: number
      cooldown_minutes?: number
    }

  if (!phone_number) {
    return NextResponse.json({ error: "phone_number is required" }, { status: 400 })
  }

  // Extract area code from phone number if not provided
  const derivedAreaCode = area_code || extractAreaCode(phone_number)

  const admin = getAdmin()

  const { data, error } = await admin
    .from("dialer_phone_numbers")
    .insert({
      phone_number,
      friendly_name: friendly_name || null,
      area_code: derivedAreaCode,
      state: state || null,
      twilio_sid: twilio_sid || null,
      max_calls_per_hour: max_calls_per_hour || 20,
      cooldown_minutes: cooldown_minutes || 30,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Phone number already exists in pool" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ number: data })
}

// PATCH /api/portal/dialer/numbers - update a number's settings
export async function PATCH(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body as {
    id: string
    friendly_name?: string
    status?: string
    max_calls_per_hour?: number
    cooldown_minutes?: number
    spam_reports?: number
    calls_today?: number
    calls_this_hour?: number
  }

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const admin = getAdmin()

  const { data, error } = await admin
    .from("dialer_phone_numbers")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ number: data })
}

// DELETE /api/portal/dialer/numbers - retire a number
export async function DELETE(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const admin = getAdmin()

  // Soft delete — mark as retired
  const { error } = await admin
    .from("dialer_phone_numbers")
    .update({ status: "retired" })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

function extractAreaCode(phone: string): string | null {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return digits.slice(0, 3)
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1, 4)
  return null
}

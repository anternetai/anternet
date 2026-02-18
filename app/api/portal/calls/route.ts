import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/portal/calls - fetch call logs with optional date range
export async function GET(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  const date = url.searchParams.get("date") // single date
  const limit = parseInt(url.searchParams.get("limit") || "100")
  const offset = parseInt(url.searchParams.get("offset") || "0")

  const admin = getAdmin()

  let query = admin
    .from("call_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (date) {
    query = query.eq("call_date", date)
  } else {
    if (from) query = query.gte("call_date", from)
    if (to) query = query.lte("call_date", to)
  }

  const { data: logs, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs, count })
}

// POST /api/portal/calls - create a new call log
export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const admin = getAdmin()

  const { data, error } = await admin
    .from("call_logs")
    .insert({
      call_date: body.call_date || new Date().toISOString().split("T")[0],
      call_time: body.call_time || new Date().toTimeString().split(" ")[0],
      business_name: body.business_name || null,
      phone_number: body.phone_number || null,
      contact_made: body.contact_made || false,
      conversation: body.conversation || false,
      demo_booked: body.demo_booked || false,
      demo_held: body.demo_held || false,
      deal_closed: body.deal_closed || false,
      outcome: body.outcome || null,
      notes: body.notes || null,
      call_duration_seconds: body.call_duration_seconds || null,
      lead_id: body.lead_id || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ log: data })
}

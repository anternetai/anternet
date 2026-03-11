import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import type { DialerLead } from "@/lib/dialer/types"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/portal/crm/leads/[id] — full lead detail + telnyx call logs
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const admin = getAdmin()

  const [{ data: lead, error: leadError }, { data: callLogs, error: logsError }] =
    await Promise.all([
      admin.from("dialer_leads").select("*").eq("id", id).single(),
      admin
        .from("telnyx_call_logs")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
    ])

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 })
  }

  return NextResponse.json({
    lead: lead as DialerLead,
    callLogs: callLogs ?? [],
  })
}

// PATCH /api/portal/crm/leads/[id]/note lives in a separate route
// but we also support it here as a convenience
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const admin = getAdmin()

  // Handle note append
  if (body.appendNote) {
    const { data: lead } = await admin
      .from("dialer_leads")
      .select("notes")
      .eq("id", id)
      .single()

    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })

    const existingNotes = lead?.notes ?? ""
    const newNotes = existingNotes
      ? `${existingNotes}\n[${timestamp} ET] ${body.appendNote}`
      : `[${timestamp} ET] ${body.appendNote}`

    const { data, error } = await admin
      .from("dialer_leads")
      .update({ notes: newNotes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ lead: data })
  }

  // Handle status updates
  const updates: Record<string, unknown> = {}
  const ALLOWED = ["status", "demo_date", "not_interested", "notes", "demo_booked"]
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()
  const { data, error } = await admin
    .from("dialer_leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead: data })
}

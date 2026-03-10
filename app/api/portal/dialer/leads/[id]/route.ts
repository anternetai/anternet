import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import type { DialerLead, DialerCallHistory } from "@/lib/dialer/types"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface LeadRecording {
  id: string
  created_at: string
  duration_seconds: number
  ai_summary: string
  ai_disposition: string
  raw_transcript: string
}

// Allowed fields for PATCH updates
const PATCHABLE_FIELDS = ["status", "not_interested", "next_call_at", "notes", "wrong_number"] as const

// PATCH /api/portal/dialer/leads/[id] - update lead fields (status, callback, etc.)
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
  if (!id) {
    return NextResponse.json({ error: "Lead ID is required" }, { status: 400 })
  }

  const body = await req.json()

  // Only allow known fields through
  const updates: Record<string, unknown> = {}
  for (const field of PATCHABLE_FIELDS) {
    if (field in body) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const admin = getAdmin()
  const { data, error } = await admin
    .from("dialer_leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ lead: data })
}

// GET /api/portal/dialer/leads/[id] - single lead with full call history and recordings
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: "Lead ID is required" }, { status: 400 })
  }

  const admin = getAdmin()

  // Fetch lead, call history, and recordings in parallel
  const [
    { data: lead, error: leadError },
    { data: callHistory, error: historyError },
    { data: recordings, error: recordingsError },
  ] = await Promise.all([
    admin.from("dialer_leads").select("*").eq("id", id).single(),
    admin
      .from("dialer_call_history")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("call_recordings")
      .select("id, created_at, duration_seconds, ai_summary, ai_disposition, raw_transcript")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
  ])

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 })
  }

  if (recordingsError) {
    return NextResponse.json({ error: recordingsError.message }, { status: 500 })
  }

  return NextResponse.json({
    lead: lead as DialerLead,
    callHistory: (callHistory || []) as DialerCallHistory[],
    recordings: (recordings || []) as LeadRecording[],
  })
}

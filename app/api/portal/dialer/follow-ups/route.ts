/**
 * GET  /api/portal/dialer/follow-ups  — paginated list of leads with scheduled follow-ups
 * POST /api/portal/dialer/follow-ups  — manually schedule (or reschedule) a follow-up
 *
 * GET params:
 *   - group: "today" | "tomorrow" | "this_week" | "next_week" | "later" (optional filter)
 *   - limit: number (default 50)
 *   - offset: number (default 0)
 *
 * POST body:
 * {
 *   lead_id: string
 *   follow_up_recommendation: FollowUpRecommendation  ("2_days" | "1_week" | "1_month" | "do_not_call" | "none")
 *   custom_date?: string   (ISO — overrides the recommendation)
 *   reason?: string
 * }
 *
 * The lead queue (GET /api/portal/dialer/queue) already returns callbacks first,
 * sorted by next_call_at ASC. AI-scheduled follow-ups that set status="callback"
 * automatically surface as the first calls when their date arrives.
 */

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import type {
  FollowUpsByGroup,
  FollowUpItem,
  FollowUpRecommendation,
} from "@/lib/dialer/ai-types"
import { FOLLOW_UP_DAYS } from "@/lib/dialer/ai-types"
import type { DialerOutcome } from "@/lib/dialer/types"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGroup(nextCallAt: string): keyof FollowUpsByGroup {
  const now = new Date()
  const target = new Date(nextCallAt)
  const diffMs = target.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffDays < 0) return "today" // overdue → show as today
  if (diffDays < 1) return "today"
  if (diffDays < 2) return "tomorrow"
  if (diffDays < 7) return "this_week"
  if (diffDays < 14) return "next_week"
  return "later"
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  // Set to 9 AM
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()
  const url = new URL(req.url)
  const groupFilter = url.searchParams.get("group") as keyof FollowUpsByGroup | null
  const limit = parseInt(url.searchParams.get("limit") || "100")
  const offset = parseInt(url.searchParams.get("offset") || "0")

  // Fetch leads with upcoming follow-ups (callback status + next_call_at set)
  const { data: leads, error } = await admin
    .from("dialer_leads")
    .select("id, business_name, owner_name, phone_number, last_outcome, next_call_at, attempt_count, state")
    .eq("status", "callback")
    .not("next_call_at", "is", null)
    .order("next_call_at", { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const allItems: FollowUpItem[] = (leads || []).map((l) => ({
    leadId: l.id as string,
    businessName: (l.business_name as string) || "Unknown",
    ownerName: (l.owner_name as string) || undefined,
    phoneNumber: (l.phone_number as string) || "",
    lastOutcome: (l.last_outcome as DialerOutcome) || "callback",
    nextCallAt: l.next_call_at as string,
    attemptCount: (l.attempt_count as number) || 0,
    state: (l.state as string) || undefined,
  }))

  // Group
  const grouped: FollowUpsByGroup = {
    today: [],
    tomorrow: [],
    this_week: [],
    next_week: [],
    later: [],
  }

  for (const item of allItems) {
    const group = getGroup(item.nextCallAt)
    grouped[group].push(item)
  }

  // Totals
  const totals = {
    today: grouped.today.length,
    tomorrow: grouped.tomorrow.length,
    this_week: grouped.this_week.length,
    next_week: grouped.next_week.length,
    later: grouped.later.length,
    total: allItems.length,
  }

  // Return filtered or all
  if (groupFilter && grouped[groupFilter]) {
    return NextResponse.json({
      items: grouped[groupFilter],
      group: groupFilter,
      totals,
    })
  }

  return NextResponse.json({
    grouped,
    totals,
  })
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json() as {
    lead_id: string
    follow_up_recommendation: FollowUpRecommendation
    custom_date?: string
    reason?: string
  }

  if (!body.lead_id) {
    return NextResponse.json({ error: "lead_id is required" }, { status: 400 })
  }

  const admin = getAdmin()

  // Verify lead exists
  const { data: lead, error: leadErr } = await admin
    .from("dialer_leads")
    .select("id, business_name, status, notes")
    .eq("id", body.lead_id)
    .single()

  if (leadErr || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  const recommendation = body.follow_up_recommendation || "none"

  // Handle DNC
  if (recommendation === "do_not_call") {
    await admin
      .from("dialer_leads")
      .update({ status: "completed", not_interested: true })
      .eq("id", body.lead_id)

    return NextResponse.json({
      success: true,
      action: "do_not_call",
      leadId: body.lead_id,
    })
  }

  // Handle "none" — just clear follow-up
  if (recommendation === "none") {
    await admin
      .from("dialer_leads")
      .update({ next_call_at: null, status: "queued" })
      .eq("id", body.lead_id)

    return NextResponse.json({
      success: true,
      action: "cleared",
      leadId: body.lead_id,
    })
  }

  // Calculate next_call_at
  let nextCallAt: string
  if (body.custom_date) {
    nextCallAt = body.custom_date
  } else {
    const days = FOLLOW_UP_DAYS[recommendation]
    if (!days) {
      return NextResponse.json({ error: "Invalid follow_up_recommendation" }, { status: 400 })
    }
    nextCallAt = addDays(days)
  }

  // Append reason note
  const now = new Date()
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  const noteEntry = body.reason
    ? `[${dateStr}] Follow-up scheduled (${recommendation}): ${body.reason}`
    : `[${dateStr}] Follow-up scheduled (${recommendation}) for ${new Date(nextCallAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`

  const existingNotes = (lead.notes as string) || ""
  const updatedNotes = existingNotes ? `${existingNotes}\n${noteEntry}` : noteEntry

  // Update lead
  const { error: updateErr } = await admin
    .from("dialer_leads")
    .update({
      status: "callback",
      next_call_at: nextCallAt,
      last_outcome: "callback" as DialerOutcome,
      notes: updatedNotes,
    })
    .eq("id", body.lead_id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    action: "scheduled",
    leadId: body.lead_id,
    recommendation,
    nextCallAt,
  })
}

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { makeCall, sendSms, toE164 } from "@/lib/telnyx"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/telnyx/calls - Fetch Telnyx call logs
 *
 * Query params:
 *   - status: filter by status
 *   - direction: inbound | outbound
 *   - from: date range start (ISO date)
 *   - to: date range end (ISO date)
 *   - search: search by phone number or notes
 *   - limit: max results (default 50)
 *   - offset: pagination offset (default 0)
 */
export async function GET(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get("status")
  const direction = url.searchParams.get("direction")
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  const search = url.searchParams.get("search")
  const limit = parseInt(url.searchParams.get("limit") || "50")
  const offset = parseInt(url.searchParams.get("offset") || "0")

  const admin = getAdmin()

  let query = admin
    .from("telnyx_call_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq("status", status)
  if (direction) query = query.eq("direction", direction)
  if (from) query = query.gte("created_at", `${from}T00:00:00`)
  if (to) query = query.lte("created_at", `${to}T23:59:59`)
  if (search) {
    query = query.or(
      `from_number.ilike.%${search}%,to_number.ilike.%${search}%,notes.ilike.%${search}%`
    )
  }

  const { data: calls, error, count } = await query

  if (error) {
    console.error("Failed to fetch Telnyx call logs:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ calls, count })
}

/**
 * POST /api/telnyx/calls - Initiate a new outbound call via Telnyx
 *
 * Body:
 *   - to: phone number to call (required)
 *   - from: caller ID (optional, defaults to TELNYX_PHONE_NUMBER)
 *   - lead_id: link to a lead (optional)
 *   - record: whether to record (optional, defaults to true)
 */
export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { to, from, lead_id, record } = body

    if (!to) {
      return NextResponse.json(
        { error: "Phone number (to) is required" },
        { status: 400 }
      )
    }

    const result = await makeCall({
      to: toE164(to),
      from: from ? toE164(from) : undefined,
      record: record !== false,
    })

    // The call log will be created by the webhook handler when we receive
    // the call.initiated event. But we can pre-create it here for immediate UI feedback.
    const admin = getAdmin()
    await admin.from("telnyx_call_logs").insert({
      telnyx_call_control_id: result.callControlId,
      telnyx_call_session_id: result.callSessionId,
      telnyx_call_leg_id: result.callLegId,
      direction: "outbound",
      from_number: from || process.env.TELNYX_PHONE_NUMBER || "",
      to_number: toE164(to),
      status: "initiated",
      lead_id: lead_id || null,
    })

    return NextResponse.json({
      success: true,
      callControlId: result.callControlId,
      callSessionId: result.callSessionId,
    })
  } catch (err) {
    console.error("Failed to initiate Telnyx call:", err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PATCH /api/telnyx/calls - Update a call log entry (notes, transcription)
 *
 * Body:
 *   - id: call log ID (required)
 *   - notes: updated notes
 *   - transcription: manual transcription
 *   - lead_id: link/unlink a lead
 */
export async function PATCH(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: "Call log ID is required" }, { status: 400 })
    }

    // Only allow updating safe fields
    const allowedFields = ["notes", "transcription", "ai_summary", "lead_id"]
    const safeUpdates: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in updates) safeUpdates[key] = updates[key]
    }

    const admin = getAdmin()
    const { data, error } = await admin
      .from("telnyx_call_logs")
      .update(safeUpdates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ call: data })
  } catch (err) {
    console.error("Failed to update call log:", err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

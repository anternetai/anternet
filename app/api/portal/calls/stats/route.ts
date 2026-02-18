import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/portal/calls/stats - get aggregated call stats
export async function GET(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")

  const admin = getAdmin()

  let query = admin
    .from("daily_call_stats")
    .select("*")
    .order("call_date", { ascending: false })

  if (from) query = query.gte("call_date", from)
  if (to) query = query.lte("call_date", to)

  const { data: stats, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ stats })
}

// POST /api/portal/calls/stats - upsert daily call stats
export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const admin = getAdmin()

  const { data, error } = await admin
    .from("daily_call_stats")
    .upsert(
      {
        call_date: body.call_date || new Date().toISOString().split("T")[0],
        total_dials: body.total_dials || 0,
        contacts: body.contacts || 0,
        conversations: body.conversations || 0,
        demos_booked: body.demos_booked || 0,
        demos_held: body.demos_held || 0,
        deals_closed: body.deals_closed || 0,
        hours_dialed: body.hours_dialed || 0,
        notes: body.notes || null,
      },
      { onConflict: "call_date" }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ stats: data })
}

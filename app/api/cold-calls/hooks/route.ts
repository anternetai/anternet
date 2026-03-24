/**
 * GET /api/cold-calls/hooks
 *
 * Returns proven_hooks ranked by demo_rate descending.
 * Optional query param: ?trade=roofing  — filters to that trade vertical first
 *
 * Returns: { hooks: ProvenHook[] }
 */

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Auth
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const trade = searchParams.get("trade")

  const admin = getAdmin()

  let query = admin
    .from("proven_hooks")
    .select(
      "id, hook_text, trade_vertical, times_used, conversations, demos_booked, demo_rate, gatekeeper_pass_rate, updated_at"
    )
    .order("demo_rate", { ascending: false })
    .limit(50)

  if (trade) {
    // Return trade-specific hooks first, then all others, both sorted by demo_rate
    // Supabase doesn't support ORDER BY CASE directly — we fetch all and sort client-side below
  }

  const { data: hooks, error } = await query

  if (error) {
    console.error("[hooks] query error:", error)
    return NextResponse.json({ error: "Failed to fetch hooks" }, { status: 500 })
  }

  let sorted = hooks ?? []

  // If trade filter, boost matching trade to top while keeping demo_rate sort within each group
  if (trade && sorted.length > 0) {
    const tradeMatch = sorted.filter((h) => h.trade_vertical === trade)
    const rest = sorted.filter((h) => h.trade_vertical !== trade)
    sorted = [...tradeMatch, ...rest]
  }

  return NextResponse.json({ hooks: sorted })
}

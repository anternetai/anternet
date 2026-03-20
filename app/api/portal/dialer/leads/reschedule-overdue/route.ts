import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/portal/dialer/leads/reschedule-overdue
 *
 * Moves all overdue callbacks (next_call_at < NOW()) to today at 9 AM ET.
 * Returns the count of leads updated.
 */
export async function POST() {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()

  // Today at 9 AM ET = 13:00 UTC (EDT) — conservative, works for EST too (14:00)
  const now = new Date()
  const todayET9AM = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 13, 0, 0)
  )
  // If it's already past 9 AM ET today, push to next available hour (now + 30 min)
  const rescheduleTarget =
    now >= todayET9AM
      ? new Date(now.getTime() + 30 * 60 * 1000) // 30 min from now
      : todayET9AM

  const { data, error } = await admin
    .from("dialer_leads")
    .update({ next_call_at: rescheduleTarget.toISOString(), updated_at: new Date().toISOString() })
    .eq("status", "callback")
    .lt("next_call_at", now.toISOString())
    .select("id")

  if (error) {
    console.error("[reschedule-overdue] DB error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const count = data?.length ?? 0
  return NextResponse.json({ rescheduled: count, reschedule_target: rescheduleTarget.toISOString() })
}

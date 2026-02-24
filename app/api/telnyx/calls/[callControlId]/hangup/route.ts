import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { hangupCall } from "@/lib/telnyx"

/**
 * POST /api/telnyx/calls/[callControlId]/hangup — Hang up an active call
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ callControlId: string }> }
) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { callControlId } = await params

  if (!callControlId) {
    return NextResponse.json({ error: "callControlId is required" }, { status: 400 })
  }

  try {
    await hangupCall(callControlId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Failed to hang up call:", err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

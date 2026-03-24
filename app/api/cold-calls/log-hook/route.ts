/**
 * POST /api/cold-calls/log-hook
 *
 * Called after every cold call to record which hook/opener was used and
 * update the proven_hooks performance table accordingly.
 *
 * Body:
 * {
 *   call_id: string          — dialer_call_history row id
 *   lead_id: string          — dialer_leads row id
 *   disposition: string      — DialerOutcome value
 *   opener_used?: string     — text of the hook/opener that was used
 *   hook_id?: string         — proven_hooks.id if a hook was selected from the list
 *   duration_seconds?: number
 *   notes?: string
 * }
 *
 * Returns: { success: boolean; hook_updated?: boolean; hook_id?: string }
 */

import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import type { DialerOutcome } from "@/lib/dialer/types"

// Dispositions that count as a "conversation" (not a hang-up or voicemail)
const CONVERSATION_DISPOSITIONS: DialerOutcome[] = ["conversation", "demo_booked"]
const DEMO_DISPOSITIONS: DialerOutcome[] = ["demo_booked"]

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: {
    call_id: string
    lead_id: string
    disposition: DialerOutcome
    opener_used?: string
    hook_id?: string
    duration_seconds?: number
    notes?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { call_id, lead_id, disposition, opener_used, hook_id, duration_seconds, notes } = body

  if (!call_id || !lead_id || !disposition) {
    return NextResponse.json(
      { error: "call_id, lead_id, and disposition are required" },
      { status: 400 }
    )
  }

  const admin = getAdmin()

  const isConversation = CONVERSATION_DISPOSITIONS.includes(disposition)
  const isDemoBooked = DEMO_DISPOSITIONS.includes(disposition)

  let hookUpdated = false
  let resolvedHookId = hook_id ?? null

  // ── If no hook_id but opener_used text provided, try to match or create ──
  if (!resolvedHookId && opener_used?.trim()) {
    const { data: existing } = await admin
      .from("proven_hooks")
      .select("id")
      .ilike("hook_text", opener_used.trim())
      .limit(1)
      .single()

    if (existing) {
      resolvedHookId = existing.id
    } else if (isConversation || isDemoBooked) {
      // Only auto-create hook rows for calls that showed results
      const { data: newHook } = await admin
        .from("proven_hooks")
        .insert({
          hook_text: opener_used.trim(),
          times_used: 0,
          conversations: 0,
          demos_booked: 0,
          demo_rate: 0,
          gatekeeper_pass_rate: 0,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single()

      if (newHook) {
        resolvedHookId = newHook.id
      }
    }
  }

  // ── Update proven_hooks stats ─────────────────────────────────────────────
  if (resolvedHookId) {
    // Fetch current stats
    const { data: hook } = await admin
      .from("proven_hooks")
      .select("times_used, conversations, demos_booked")
      .eq("id", resolvedHookId)
      .single()

    if (hook) {
      const newTimesUsed = (hook.times_used ?? 0) + 1
      const newConversations = (hook.conversations ?? 0) + (isConversation ? 1 : 0)
      const newDemos = (hook.demos_booked ?? 0) + (isDemoBooked ? 1 : 0)

      // demo_rate = demos / times_used; gatekeeper_pass_rate = conversations / times_used
      const demoRate = newTimesUsed > 0 ? newDemos / newTimesUsed : 0
      const gkPassRate = newTimesUsed > 0 ? newConversations / newTimesUsed : 0

      const { error: updateErr } = await admin
        .from("proven_hooks")
        .update({
          times_used: newTimesUsed,
          conversations: newConversations,
          demos_booked: newDemos,
          demo_rate: Math.round(demoRate * 1000) / 1000,
          gatekeeper_pass_rate: Math.round(gkPassRate * 1000) / 1000,
          updated_at: new Date().toISOString(),
        })
        .eq("id", resolvedHookId)

      if (!updateErr) hookUpdated = true
    }
  }

  // ── Log the hook usage to call_hook_usage (optional audit table) ──────────
  // Silently skip if table doesn't exist — non-critical
  await admin
    .from("call_hook_usage")
    .insert({
      call_id,
      lead_id,
      hook_id: resolvedHookId,
      opener_text: opener_used ?? null,
      disposition,
      duration_seconds: duration_seconds ?? null,
      notes: notes ?? null,
      created_at: new Date().toISOString(),
    })
    .then(() => null) // swallow errors — table may not exist yet

  return NextResponse.json({
    success: true,
    hook_updated: hookUpdated,
    hook_id: resolvedHookId,
  })
}

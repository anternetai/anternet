import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { status, outcome_quote_given, outcome_quote_amount, outcome_job_sold, outcome_job_amount } = body

  // Verify user owns this appointment via their client record
  const { data: client } = await supabase
    .from("agency_clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, status, client_id")
    .eq("id", id)
    .eq("client_id", client.id)
    .single()

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
  }

  // Build update payload
  const updateData: Record<string, unknown> = {}

  if (status) {
    // Idempotency: don't re-process if already in this status
    if (appointment.status === status) {
      return NextResponse.json({ message: "Already in this status" })
    }
    updateData.status = status
  }

  if (outcome_quote_given !== undefined) updateData.outcome_quote_given = outcome_quote_given
  if (outcome_quote_amount !== undefined) updateData.outcome_quote_amount = outcome_quote_amount
  if (outcome_job_sold !== undefined) updateData.outcome_job_sold = outcome_job_sold
  if (outcome_job_amount !== undefined) updateData.outcome_job_amount = outcome_job_amount

  const { error: updateError } = await supabase
    .from("appointments")
    .update(updateData)
    .eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Trigger Stripe charge via n8n webhook on "showed"
  if (status === "showed") {
    try {
      const n8nUrl = process.env.N8N_BASE_URL || "https://n8n-production-1286.up.railway.app"
      await fetch(`${n8nUrl}/webhook/stripe-charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment_id: id,
          client_id: client.id,
        }),
      })
    } catch {
      // Log but don't fail the request — n8n webhook failure shouldn't block the UI
      console.error("Failed to trigger Stripe charge webhook")
    }
  }

  return NextResponse.json({ success: true })
}

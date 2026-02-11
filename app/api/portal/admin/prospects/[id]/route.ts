import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized", status: 401 }

  const { data: adminClient } = await supabase
    .from("agency_clients")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  if (!adminClient || adminClient.role !== "admin") {
    return { error: "Forbidden", status: 403 }
  }

  return { user }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const auth = await verifyAdmin(supabase)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { call_outcome, follow_up_at, last_called_at, notes, name, phone, email } = body

    // Build update payload - only include fields that were provided
    const updatePayload: Record<string, unknown> = {}

    if (call_outcome !== undefined) updatePayload.call_outcome = call_outcome
    if (follow_up_at !== undefined) updatePayload.follow_up_at = follow_up_at
    if (last_called_at !== undefined) updatePayload.last_called_at = last_called_at
    if (notes !== undefined) updatePayload.notes = notes
    if (name !== undefined) updatePayload.name = name
    if (phone !== undefined) updatePayload.phone = phone
    if (email !== undefined) updatePayload.email = email

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    const { data: prospect, error } = await supabase
      .from("crm_prospects")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      // Could be a "no rows found" scenario
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Prospect not found" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ prospect })
  } catch (err) {
    console.error("PATCH /api/portal/admin/prospects/[id] error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const auth = await verifyAdmin(supabase)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { error } = await supabase
      .from("crm_prospects")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/portal/admin/prospects/[id] error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

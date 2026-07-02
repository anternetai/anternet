import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const { data: adminClient } = await supabase
    .from("agency_clients")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  if (!adminClient || adminClient.role !== "admin") {
    return { supabase, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { supabase, response: null }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  const { data, error } = await supabase
    .from("agency_clients")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }
  return NextResponse.json(data)
}

// Fields the onboarding call page is allowed to update
const PATCHABLE_FIELDS = new Set([
  "calendar_id",
  "working_hours_start",
  "working_hours_end",
  "appointment_duration",
  "timezone",
  "working_days",
  "differentiator",
  "offer",
  "facebook_page_id",
  "ad_account_id",
  "onboarding_status",
])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, response } = await requireAdmin()
  if (response) return response

  const { id } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (PATCHABLE_FIELDS.has(key)) {
      updates[key] = value
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("agency_clients")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json(data)
}

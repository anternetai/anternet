import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify admin role
  const { data: adminClient } = await supabase
    .from("agency_clients")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  if (!adminClient || adminClient.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Single query via view — replaces N+1 pattern (was 5 queries per client)
  const { data: clients, error } = await supabase
    .from("admin_client_metrics")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch admin client metrics:", error)
    // Fallback to basic query if view doesn't exist
    const { data: fallbackClients } = await supabase
      .from("agency_clients")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

    return NextResponse.json({
      clients: (fallbackClients || []).map((c) => ({
        ...c,
        lead_count: 0,
        appointment_count: 0,
        show_rate: 0,
        total_charged: 0,
        last_lead_at: null,
      })),
    })
  }

  return NextResponse.json({ clients: clients || [] })
}

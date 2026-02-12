import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ client: null, teamMember: null })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })
    }

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)

    // Try direct match first (primary client)
    const { data: directClient } = await admin
      .from("agency_clients")
      .select("*")
      .eq("auth_user_id", user.id)
      .single()

    if (directClient) {
      return NextResponse.json({ client: directClient, teamMember: null })
    }

    // Fallback: check if user is a team member
    const { data: tm } = await admin
      .from("client_team_members")
      .select("*")
      .eq("auth_user_id", user.id)
      .limit(1)
      .single()

    if (tm) {
      const { data: parentClient } = await admin
        .from("agency_clients")
        .select("*")
        .eq("id", tm.client_id)
        .single()

      if (parentClient) {
        return NextResponse.json({ client: parentClient, teamMember: tm })
      }
    }

    return NextResponse.json({ client: null, teamMember: null })
  } catch (err) {
    console.error("GET /api/portal/me error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

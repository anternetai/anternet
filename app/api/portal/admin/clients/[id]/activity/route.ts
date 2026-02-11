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

export async function GET(
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

    // Parse pagination from query params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))
    const offset = (page - 1) * limit

    // Get total count
    const { count } = await supabase
      .from("client_activity")
      .select("id", { count: "exact", head: true })
      .eq("client_id", id)

    // Get paginated results
    const { data: activity, error } = await supabase
      .from("client_activity")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      activity: activity ?? [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    })
  } catch (err) {
    console.error("GET /api/portal/admin/clients/[id]/activity error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
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
    const { type, title, detail, metadata } = body

    if (!type || typeof type !== "string") {
      return NextResponse.json(
        { error: "Type is required" },
        { status: 400 }
      )
    }

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    const { data: entry, error } = await supabase
      .from("client_activity")
      .insert({
        client_id: id,
        type,
        title,
        detail: detail ?? null,
        metadata: metadata ?? null,
      })
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ activity: entry }, { status: 201 })
  } catch (err) {
    console.error("POST /api/portal/admin/clients/[id]/activity error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

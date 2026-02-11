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

    const { data: tasks, error } = await supabase
      .from("client_tasks")
      .select("*")
      .eq("client_id", id)
      .order("sort_order", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tasks: tasks ?? [] })
  } catch (err) {
    console.error("GET /api/portal/admin/clients/[id]/tasks error:", err)
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
    const { title, due_at, pipeline_stage } = body

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    // Get max sort_order for this client to append at end
    const { data: lastTask } = await supabase
      .from("client_tasks")
      .select("sort_order")
      .eq("client_id", id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (lastTask?.sort_order ?? -1) + 1

    const { data: task, error } = await supabase
      .from("client_tasks")
      .insert({
        client_id: id,
        title: title.trim(),
        due_at: due_at ?? null,
        pipeline_stage: pipeline_stage ?? null,
        sort_order: nextOrder,
        completed: false,
      })
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ task }, { status: 201 })
  } catch (err) {
    console.error("POST /api/portal/admin/clients/[id]/tasks error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
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
    const { id: taskId, completed, title, due_at } = body

    if (!taskId) {
      return NextResponse.json(
        { error: "Task id is required" },
        { status: 400 }
      )
    }

    // Verify the task belongs to this client
    const { data: existingTask, error: fetchError } = await supabase
      .from("client_tasks")
      .select("id, client_id, title")
      .eq("id", taskId)
      .eq("client_id", id)
      .single()

    if (fetchError || !existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Build update payload - only include fields that were provided
    const updatePayload: Record<string, unknown> = {}

    if (typeof completed === "boolean") {
      updatePayload.completed = completed
      updatePayload.completed_at = completed ? new Date().toISOString() : null
    }

    if (typeof title === "string" && title.trim().length > 0) {
      updatePayload.title = title.trim()
    }

    if (due_at !== undefined) {
      updatePayload.due_at = due_at
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    const { data: task, error } = await supabase
      .from("client_tasks")
      .update(updatePayload)
      .eq("id", taskId)
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity if task was completed
    if (completed === true) {
      await supabase.from("client_activity").insert({
        client_id: id,
        type: "task_completed",
        title: `Task completed: ${existingTask.title}`,
        metadata: { task_id: taskId },
      })
    }

    return NextResponse.json({ task })
  } catch (err) {
    console.error("PATCH /api/portal/admin/clients/[id]/tasks error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

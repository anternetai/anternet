import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// DELETE /api/portal/tasks/[id] — remove a task
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!id) return NextResponse.json({ error: "Task ID is required" }, { status: 400 })

  const admin = getAdmin()

  // Only allow deleting manual tasks (not auto-generated ones)
  const { data: task, error: fetchError } = await admin
    .from("daily_tasks")
    .select("id, source, xp_value, completed")
    .eq("id", id)
    .single()

  if (fetchError || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  // Reclaim XP if the task was completed
  if (task.completed) {
    const { data: stats } = await admin
      .from("user_stats")
      .select("total_xp")
      .eq("user_id", "anthony")
      .single()

    if (stats) {
      await admin
        .from("user_stats")
        .update({ total_xp: Math.max(0, (stats.total_xp ?? 0) - task.xp_value) })
        .eq("user_id", "anthony")
    }
  }

  const { error } = await admin.from("daily_tasks").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

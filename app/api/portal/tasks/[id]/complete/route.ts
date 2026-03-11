import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// PATCH /api/portal/tasks/[id]/complete — toggle task completion + update XP/streak
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const completed: boolean = body.completed ?? true

  const admin = getAdmin()

  // Update the task
  const { data: task, error: taskError } = await admin
    .from("daily_tasks")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select()
    .single()

  if (taskError || !task) {
    return NextResponse.json({ error: taskError?.message ?? "Not found" }, { status: 500 })
  }

  const today = task.task_date

  // Check if ALL tasks for today are now complete
  const { data: todayTasks } = await admin
    .from("daily_tasks")
    .select("completed, xp_value")
    .eq("task_date", today)

  const allComplete = todayTasks?.every((t) => t.completed) ?? false
  const totalXpEarned = todayTasks?.reduce((sum, t) => sum + (t.completed ? t.xp_value : 0), 0) ?? 0
  const xpDelta = completed ? task.xp_value : -task.xp_value

  // Update user_stats XP
  const { data: stats } = await admin
    .from("user_stats")
    .select("*")
    .eq("user_id", "anthony")
    .single()

  if (stats) {
    const newTotalXp = Math.max(0, (stats.total_xp ?? 0) + xpDelta)
    let newStreak = stats.current_streak ?? 0
    let longestStreak = stats.longest_streak ?? 0

    if (allComplete && today !== stats.last_completed_date) {
      // Increment streak
      // Use ET timezone to match task_date records
      const etNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }))
      etNow.setDate(etNow.getDate() - 1)
      const yesterdayStr = etNow.toLocaleDateString("en-CA")

      if (stats.last_completed_date === yesterdayStr) {
        newStreak = (stats.current_streak ?? 0) + 1
      } else if (stats.last_completed_date !== today) {
        newStreak = 1
      }
      longestStreak = Math.max(longestStreak, newStreak)

      await admin
        .from("user_stats")
        .update({
          total_xp: newTotalXp,
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_completed_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", "anthony")
    } else {
      await admin
        .from("user_stats")
        .update({
          total_xp: newTotalXp,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", "anthony")
    }
  }

  return NextResponse.json({
    task,
    allComplete,
    totalXpEarned,
    xpDelta,
  })
}

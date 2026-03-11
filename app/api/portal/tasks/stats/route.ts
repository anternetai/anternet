import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/portal/tasks/stats — XP total, streak, weekly summary
export async function GET() {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()

  // Get user stats
  const { data: stats } = await admin
    .from("user_stats")
    .select("*")
    .eq("user_id", "anthony")
    .single()

  // Get last 7 days of tasks for weekly summary
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const weekStart = sevenDaysAgo.toISOString().split("T")[0]
  const today = new Date().toISOString().split("T")[0]

  const { data: weeklyTasks } = await admin
    .from("daily_tasks")
    .select("task_date, completed, xp_value, category")
    .gte("task_date", weekStart)
    .lte("task_date", today)

  // Group by date
  const byDate: Record<string, { total: number; completed: number; xp: number }> = {}
  for (const task of weeklyTasks ?? []) {
    if (!byDate[task.task_date]) {
      byDate[task.task_date] = { total: 0, completed: 0, xp: 0 }
    }
    byDate[task.task_date].total++
    if (task.completed) {
      byDate[task.task_date].completed++
      byDate[task.task_date].xp += task.xp_value ?? 0
    }
  }

  const weeklyCompleted = (weeklyTasks ?? []).filter((t) => t.completed).length
  const weeklyXp = (weeklyTasks ?? []).reduce(
    (sum, t) => sum + (t.completed ? (t.xp_value ?? 0) : 0),
    0
  )
  const weeklyTotal = (weeklyTasks ?? []).length

  return NextResponse.json({
    stats: stats ?? {
      total_xp: 0,
      current_streak: 0,
      longest_streak: 0,
      last_completed_date: null,
    },
    weekly: {
      completed: weeklyCompleted,
      total: weeklyTotal,
      xp: weeklyXp,
      byDate,
    },
  })
}

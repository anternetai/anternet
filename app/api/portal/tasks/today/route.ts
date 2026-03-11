import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// XP values per category
const XP_VALUES: Record<string, number> = {
  HFH: 100,
  SQUEEGEE: 50,
  DAILY: 25,
  PERSONAL: 25,
}

// Standard daily blocks (weekdays only)
const DAILY_BLOCKS = [
  {
    title: "Cold calls 7–11:30 AM",
    category: "HFH",
    scheduled_time: "07:00:00",
    xp_value: 75,
    source: "auto_daily",
  },
  {
    title: "Door knocks 4–6 PM",
    category: "SQUEEGEE",
    scheduled_time: "16:00:00",
    xp_value: 50,
    source: "auto_daily",
  },
]

// GET /api/portal/tasks/today — returns today's tasks, auto-generates if needed
export async function GET() {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()
  const today = new Date().toISOString().split("T")[0]
  const todayDate = new Date()
  const dayOfWeek = todayDate.getDay() // 0 = Sunday, 6 = Saturday
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

  // Fetch existing tasks for today
  const { data: existingTasks } = await admin
    .from("daily_tasks")
    .select("*")
    .eq("task_date", today)
    .order("scheduled_time", { ascending: true, nullsFirst: false })

  const tasksToInsert: Array<Record<string, unknown>> = []

  // Check which auto sources already have tasks today
  const existingAutoDaily = existingTasks?.some((t) => t.source === "auto_daily") ?? false
  const existingDemoIds = new Set(
    existingTasks?.filter((t) => t.source === "auto_demo").map((t) => String(t.source_id)) ?? []
  )
  const existingSqueegeIds = new Set(
    existingTasks?.filter((t) => t.source === "auto_squeegee").map((t) => String(t.source_id)) ?? []
  )

  // 1. Standard daily blocks (weekdays only)
  if (isWeekday && !existingAutoDaily) {
    for (const block of DAILY_BLOCKS) {
      tasksToInsert.push({
        task_date: today,
        ...block,
      })
    }
  }

  // 2. HFH demo calls booked for today
  const { data: demos } = await admin
    .from("dialer_leads")
    .select("id, business_name, owner_name, demo_date")
    .eq("demo_booked", true)
    .not("demo_date", "is", null)

  if (demos) {
    for (const demo of demos) {
      if (!demo.demo_date) continue
      const demoDate = new Date(demo.demo_date)
      const demoDateStr = demoDate.toISOString().split("T")[0]
      if (demoDateStr !== today) continue
      if (existingDemoIds.has(demo.id)) continue

      const hours = String(demoDate.getUTCHours()).padStart(2, "0")
      const mins = String(demoDate.getUTCMinutes()).padStart(2, "0")

      tasksToInsert.push({
        task_date: today,
        title: `HFH Demo Call — ${demo.business_name ?? demo.owner_name ?? "Unknown"}`,
        category: "HFH",
        scheduled_time: `${hours}:${mins}:00`,
        xp_value: 100,
        source: "auto_demo",
        source_id: demo.id,
      })
    }
  }

  // 3. Squeegee jobs today
  const { data: squeegeJobs } = await admin
    .from("squeegee_jobs")
    .select("id, client_name, service_type, appointment_time")
    .eq("appointment_date", today)

  if (squeegeJobs) {
    for (const job of squeegeJobs) {
      if (existingSqueegeIds.has(job.id)) continue
      tasksToInsert.push({
        task_date: today,
        title: `Squeegee Job — ${job.client_name ?? "Client"} (${job.service_type ?? "Service"})`,
        category: "SQUEEGEE",
        scheduled_time: job.appointment_time ?? null,
        xp_value: 50,
        source: "auto_squeegee",
        source_id: job.id,
      })
    }
  }

  // Insert new auto-generated tasks
  if (tasksToInsert.length > 0) {
    await admin.from("daily_tasks").insert(tasksToInsert)
  }

  // Fetch final list of today's tasks (after inserts)
  const { data: tasks, error } = await admin
    .from("daily_tasks")
    .select("*")
    .eq("task_date", today)
    .order("scheduled_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const total = tasks?.length ?? 0
  const completed = tasks?.filter((t) => t.completed).length ?? 0
  const totalXp = tasks?.reduce((sum, t) => sum + (t.completed ? t.xp_value : 0), 0) ?? 0

  return NextResponse.json({
    tasks: tasks ?? [],
    summary: { total, completed, totalXp },
    date: today,
  })
}

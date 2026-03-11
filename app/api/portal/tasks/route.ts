import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/portal/tasks — add a manual task
export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title, category, scheduled_time, task_date, notes } = body

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const XP_MAP: Record<string, number> = {
    HFH: 100,
    SQUEEGEE: 50,
    DAILY: 25,
    PERSONAL: 25,
  }

  const cat = category ?? "PERSONAL"
  const admin = getAdmin()
  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await admin
    .from("daily_tasks")
    .insert({
      title,
      category: cat,
      scheduled_time: scheduled_time ?? null,
      xp_value: XP_MAP[cat] ?? 25,
      task_date: task_date ?? today,
      source: "manual",
      notes: notes ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ task: data })
}

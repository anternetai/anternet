import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/mission/training — list all training entries
export async function GET() {
  const supabase = getAdmin()

  const { data, error } = await supabase
    .from("training_log")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entries: data || [] })
}

// POST /api/mission/training — create a new training entry
export async function POST(req: NextRequest) {
  const supabase = getAdmin()
  const body = await req.json()
  const { course_name, module_name, key_takeaway, real_world_connection } = body

  if (!course_name || !module_name || !key_takeaway) {
    return NextResponse.json(
      { error: "course_name, module_name, and key_takeaway are required" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("training_log")
    .insert({
      course_name,
      module_name,
      key_takeaway,
      real_world_connection: real_world_connection || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entry: data })
}

// PATCH /api/mission/training — review an entry (Got It / Rusty)
export async function PATCH(req: NextRequest) {
  const supabase = getAdmin()
  const body = await req.json()
  const { id, action } = body

  if (!id || !action || !["got_it", "rusty"].includes(action)) {
    return NextResponse.json(
      { error: "id and action (got_it or rusty) are required" },
      { status: 400 }
    )
  }

  // Fetch current entry
  const { data: entry, error: fetchError } = await supabase
    .from("training_log")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchError || !entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  const now = new Date()
  let nextReview: Date
  let newReviewCount = entry.review_count
  let newEase = entry.ease
  let completed = entry.completed

  if (action === "got_it") {
    newReviewCount += 1
    newEase = "easy"
    // Interval doubles: 1→2→4→8→16 days
    const intervalDays = Math.pow(2, newReviewCount)
    nextReview = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000)
    // After 4 successful reviews (16+ day interval), mark completed
    if (newReviewCount >= 4) {
      completed = true
    }
  } else {
    // Rusty — reset to 1 day
    newReviewCount = 0
    newEase = "hard"
    nextReview = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
  }

  const { data, error } = await supabase
    .from("training_log")
    .update({
      next_review_at: nextReview.toISOString(),
      review_count: newReviewCount,
      ease: newEase,
      completed,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entry: data })
}

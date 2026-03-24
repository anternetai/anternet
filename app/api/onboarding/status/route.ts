import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { hydrateChecklist, automatedProgress } from "@/lib/onboarding/checklist"

// ─── GET /api/onboarding/status ───────────────────────────────────────────────
// Returns all clients in "onboarding" stage with checklist progress.
// Flags any client stuck > 3 days.

const STUCK_THRESHOLD_DAYS = 3

export async function GET() {
  try {
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

    // Fetch all clients currently in onboarding
    const { data: clients, error } = await supabase
      .from("agency_clients")
      .select(
        "id, legal_business_name, first_name, last_name, email_for_notifications, cell_phone_for_notifications, pipeline_stage, pipeline_stage_changed_at, service_type, questions, created_at"
      )
      .eq("pipeline_stage", "onboarding")
      .is("deleted_at", null)
      .neq("role", "admin")
      .order("pipeline_stage_changed_at", { ascending: true })

    if (error) {
      console.error("Failed to fetch onboarding clients:", error)
      return NextResponse.json({ error: "Failed to fetch onboarding clients" }, { status: 500 })
    }

    const now = Date.now()

    const results = (clients ?? []).map((client) => {
      // Calculate days in onboarding
      const stageEnteredAt = client.pipeline_stage_changed_at ?? client.created_at
      const msInStage = now - new Date(stageEnteredAt).getTime()
      const daysInOnboarding = Math.floor(msInStage / (1000 * 60 * 60 * 24))
      const isStuck = daysInOnboarding > STUCK_THRESHOLD_DAYS

      // Hydrate checklist from stored metadata
      let storedChecklist: Record<string, { status: "pending" | "in_progress" | "complete" | "blocked"; completedAt?: string }> | null = null
      if (client.questions) {
        try {
          const parsed = JSON.parse(client.questions as string)
          storedChecklist = parsed.onboarding_checklist ?? null
        } catch {
          // questions field is plain text or malformed JSON — ignore
        }
      }

      const checklist = hydrateChecklist(storedChecklist)
      const progress = automatedProgress(checklist)

      return {
        id: client.id,
        business_name: client.legal_business_name,
        contact_name: `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim(),
        contact_email: client.email_for_notifications,
        contact_phone: client.cell_phone_for_notifications,
        service_type: client.service_type,
        pipeline_stage_changed_at: stageEnteredAt,
        days_in_onboarding: daysInOnboarding,
        is_stuck: isStuck,
        checklist,
        progress,
      }
    })

    const stuckCount = results.filter((r) => r.is_stuck).length
    const totalInOnboarding = results.length

    return NextResponse.json({
      total: totalInOnboarding,
      stuck_count: stuckCount,
      clients: results,
    })
  } catch (err) {
    console.error("GET /api/onboarding/status error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const VALID_STAGES = ["demo", "onboarding", "setup", "launch", "active"] as const
type PipelineStage = (typeof VALID_STAGES)[number]

const PIPELINE_STAGE_TASKS: Record<PipelineStage, string[]> = {
  demo: ["Schedule demo call", "Send intro email"],
  onboarding: [
    "Schedule onboarding call",
    "Get calendar access",
    "Send service agreement",
    "Collect business info",
  ],
  setup: [
    "Set up Facebook page access",
    "Create ad account",
    "Build ad creatives",
    "Configure lead form",
  ],
  launch: [
    "Schedule launch call",
    "Review ad setup with client",
    "Launch ads",
  ],
  active: ["Monitor ad performance", "Weekly check-in"],
}

// Map: when advancing TO a stage, mark the PREVIOUS stage's call timestamp
const STAGE_CALL_FIELDS: Partial<Record<PipelineStage, string>> = {
  onboarding: "demo_call_at",
  launch: "launch_call_at",
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const body = await request.json()
    const { stage } = body

    if (!stage || !VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}` },
        { status: 400 }
      )
    }

    // Get current client to know the old stage
    const { data: currentClient, error: fetchError } = await supabase
      .from("agency_clients")
      .select("pipeline_stage, legal_business_name")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (fetchError || !currentClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    const oldStage = currentClient.pipeline_stage ?? "demo"
    const now = new Date().toISOString()

    // Build update payload
    const updatePayload: Record<string, string | null> = {
      pipeline_stage: stage,
      pipeline_stage_changed_at: now,
    }

    // Set the corresponding call_at field if advancing
    const callField = STAGE_CALL_FIELDS[stage as PipelineStage]
    if (callField) {
      updatePayload[callField] = now
    }

    // If moving to onboarding, also set onboarding_call_at
    if (stage === "onboarding") {
      updatePayload.onboarding_call_at = now
    }

    // Update client record
    const { data: updatedClient, error: updateError } = await supabase
      .from("agency_clients")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log activity
    await supabase.from("client_activity").insert({
      client_id: id,
      type: "stage_change",
      title: `Pipeline stage changed to ${stage}`,
      detail: `Moved from "${oldStage}" to "${stage}"`,
      metadata: { old_stage: oldStage, new_stage: stage },
    })

    // Auto-create default tasks for the new stage
    const defaultTasks = PIPELINE_STAGE_TASKS[stage as PipelineStage] ?? []
    if (defaultTasks.length > 0) {
      const taskInserts = defaultTasks.map((title, index) => ({
        client_id: id,
        title,
        pipeline_stage: stage,
        sort_order: index,
        completed: false,
      }))

      await supabase.from("client_tasks").insert(taskInserts)
    }

    return NextResponse.json({ client: updatedClient })
  } catch (err) {
    console.error("PATCH /api/portal/admin/clients/[id]/pipeline error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

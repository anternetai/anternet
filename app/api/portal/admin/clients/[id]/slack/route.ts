import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
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
    const { message } = body

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Look up client's Slack channel
    const { data: client, error: clientError } = await supabase
      .from("agency_clients")
      .select("slack_channel_id, legal_business_name")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    if (!client.slack_channel_id) {
      return NextResponse.json(
        { error: "No Slack channel configured" },
        { status: 400 }
      )
    }

    // Send message via Slack Web API
    const slackToken = process.env.SLACK_BOT_TOKEN
    if (!slackToken) {
      return NextResponse.json(
        { error: "Slack integration not configured" },
        { status: 500 }
      )
    }

    const slackResponse = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${slackToken}`,
      },
      body: JSON.stringify({
        channel: client.slack_channel_id,
        text: message.trim(),
      }),
    })

    const slackResult = await slackResponse.json()

    if (!slackResult.ok) {
      console.error("Slack API error:", slackResult.error)
      return NextResponse.json(
        { error: `Slack error: ${slackResult.error}` },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from("client_activity").insert({
      client_id: id,
      type: "slack_message",
      title: "Slack message sent",
      detail: message.trim(),
      metadata: {
        channel_id: client.slack_channel_id,
        slack_ts: slackResult.ts,
      },
    })

    return NextResponse.json({ success: true, ts: slackResult.ts })
  } catch (err) {
    console.error("POST /api/portal/admin/clients/[id]/slack error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

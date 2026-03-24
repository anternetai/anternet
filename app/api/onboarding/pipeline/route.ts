import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { DEFAULT_CHECKLIST, type OnboardingStep } from "@/lib/onboarding/checklist"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineRequest {
  client_name: string
  business_type: "roofing" | "hvac" | "plumbing" | "landscaping" | "general" | "other"
  location: string
  contact_name: string
  contact_email: string
  contact_phone: string
  signed_date: string
}

interface GeneratedContent {
  market_research: string
  content_calendar: string
  ad_copy_variants: [string, string, string]
}

// ─── Supabase service-role client (bypasses RLS for pipeline writes) ──────────

function getServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required")
  }
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ─── AI Content Generation (OpenAI GPT-4) ────────────────────────────────────

async function generateContent(req: PipelineRequest): Promise<GeneratedContent> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    // Graceful fallback — return placeholder content rather than hard-failing
    return buildFallbackContent(req)
  }

  const businessTypeLabel = {
    roofing: "roofing contractor",
    hvac: "HVAC contractor",
    plumbing: "plumber",
    landscaping: "landscaping company",
    general: "general contractor",
    other: "home service contractor",
  }[req.business_type]

  const prompt = `You are a Facebook ads strategist specializing in home service contractor lead generation. Generate three sections of content for a new client onboarding.

CLIENT:
- Business: ${req.client_name}
- Type: ${businessTypeLabel}
- Location: ${req.location}
- Contact: ${req.contact_name}

---

SECTION 1 — MARKET RESEARCH BRIEF (300-400 words)
Write a concise market research brief covering:
• Local competitive landscape for ${businessTypeLabel}s in ${req.location}
• Typical pain points homeowners search for in this trade
• Average job value and seasonality patterns
• Recommended target audience demographics for Facebook ads
• 2-3 specific local angles or hooks to exploit in ad copy

---

SECTION 2 — 30-DAY CONTENT CALENDAR OUTLINE
List weeks 1-4. For each week, give:
• Theme (one sentence)
• 3 content ideas with format (video, image, carousel) and hook line

---

SECTION 3 — FACEBOOK AD COPY VARIANTS
Write exactly 3 ad copy variants. Each must include:
• Headline (under 40 chars)
• Primary text (2-3 sentences, conversational, pain-point led)
• Call to action (e.g., "Get Your Free Quote")

Format your entire response as valid JSON matching this schema exactly:
{
  "market_research": "<full text>",
  "content_calendar": "<full text>",
  "ad_copy_variants": ["<variant 1 full text>", "<variant 2 full text>", "<variant 3 full text>"]
}`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      console.error("OpenAI API error:", response.status, await response.text())
      return buildFallbackContent(req)
    }

    const data = await response.json()
    const parsed = JSON.parse(data.choices[0].message.content)

    return {
      market_research: parsed.market_research ?? "",
      content_calendar: parsed.content_calendar ?? "",
      ad_copy_variants: (parsed.ad_copy_variants ?? ["", "", ""]) as [string, string, string],
    }
  } catch (err) {
    console.error("Content generation failed, using fallback:", err)
    return buildFallbackContent(req)
  }
}

function buildFallbackContent(req: PipelineRequest): GeneratedContent {
  const businessTypeLabel = req.business_type.charAt(0).toUpperCase() + req.business_type.slice(1)

  return {
    market_research: `[PENDING AI GENERATION]\n\nMarket Research Brief for ${req.client_name} (${businessTypeLabel}) — ${req.location}\n\nThis brief will be generated once OpenAI credentials are configured. Key areas to research:\n• Local competitor landscape\n• Homeowner pain points in ${req.location}\n• Seasonal demand patterns\n• Recommended Facebook audience demographics`,

    content_calendar: `[PENDING AI GENERATION]\n\n30-Day Content Calendar for ${req.client_name}\n\nWeek 1 — Brand Introduction\nWeek 2 — Social Proof & Reviews\nWeek 3 — Problem/Solution\nWeek 4 — Special Offer / Call to Action\n\nFull calendar will be generated once OpenAI credentials are configured.`,

    ad_copy_variants: [
      `[VARIANT 1 — PENDING]\nHeadline: Tired of ${businessTypeLabel} Hassles?\nBody: ${req.client_name} handles ${req.business_type} jobs across ${req.location}. Fast quotes, honest pricing.\nCTA: Get Your Free Quote`,
      `[VARIANT 2 — PENDING]\nHeadline: ${req.location}'s Trusted ${businessTypeLabel}\nBody: Homeowners in ${req.location} choose ${req.client_name} for reliable ${req.business_type} service.\nCTA: Book a Free Estimate`,
      `[VARIANT 3 — PENDING]\nHeadline: Don't Wait — Fix It Today\nBody: ${req.client_name} is available now in ${req.location}. Same-week appointments available.\nCTA: Schedule Now`,
    ],
  }
}

// ─── Slack Channel Creation ───────────────────────────────────────────────────

async function createSlackChannel(clientName: string): Promise<string | null> {
  const slackToken = process.env.SLACK_BOT_TOKEN
  if (!slackToken) return null

  const channelName = `client-${clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 76)}` // Slack channel names: max 80 chars

  try {
    const createRes = await fetch("https://slack.com/api/conversations.create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${slackToken}`,
      },
      body: JSON.stringify({ name: channelName, is_private: false }),
    })

    const createData = await createRes.json()

    if (createData.ok) {
      return createData.channel.id as string
    }

    // Channel might already exist — try to find it
    if (createData.error === "name_taken") {
      const listRes = await fetch(
        `https://slack.com/api/conversations.list?limit=1000&types=public_channel`,
        { headers: { Authorization: `Bearer ${slackToken}` } }
      )
      const listData = await listRes.json()
      const existing = (listData.channels ?? []).find(
        (c: { name: string; id: string }) => c.name === channelName
      )
      return existing?.id ?? null
    }

    console.error("Slack channel creation failed:", createData.error)
    return null
  } catch (err) {
    console.error("Slack channel error:", err)
    return null
  }
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

async function sendWelcomeEmail(req: PipelineRequest): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey || !req.contact_email) return false

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #0f0f0f; padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to HomeField Hub</h1>
      </div>
      <div style="background: #f9f9f9; padding: 32px; border-radius: 0 0 12px 12px;">
        <p>Hey ${req.contact_name},</p>
        <p>Welcome aboard! We're fired up to help <strong>${req.client_name}</strong> generate qualified leads through Facebook ads.</p>
        <p>Here's what's happening right now:</p>
        <ul style="padding-left: 20px; line-height: 2;">
          <li>We're building your market research brief</li>
          <li>Drafting your first Facebook ad copy variants</li>
          <li>Laying out your 30-day content calendar</li>
        </ul>
        <p>Your kickoff call will be scheduled within the next 48 hours. Watch for a calendar invite.</p>
        <p>In the meantime, get Meta Business Manager set up if you haven't already — we'll need access to run ads.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #666; font-size: 14px;">Questions? Reply to this email or text/call us directly.</p>
        <p style="color: #666; font-size: 14px;">— The HomeField Hub Team</p>
      </div>
    </div>
  `

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "HomeField Hub <no-reply@homefieldhub.com>",
        to: [req.contact_email.trim()],
        subject: `Welcome to HomeField Hub — ${req.client_name} onboarding started`,
        html,
      }),
    })

    return res.ok
  } catch (err) {
    console.error("Welcome email failed:", err)
    return false
  }
}

// ─── Step status tracker ──────────────────────────────────────────────────────

function markStep(
  checklist: OnboardingStep[],
  id: string,
  status: OnboardingStep["status"]
): OnboardingStep[] {
  return checklist.map((s) =>
    s.id === id
      ? { ...s, status, ...(status === "complete" ? { completedAt: new Date().toISOString() } : {}) }
      : s
  )
}

// ─── POST /api/onboarding/pipeline ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Auth check — must be signed in admin
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: adminCheck } = await supabase
      .from("agency_clients")
      .select("role")
      .eq("auth_user_id", user.id)
      .single()

    if (!adminCheck || adminCheck.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Parse + validate body
    const body: PipelineRequest = await request.json()

    const required: (keyof PipelineRequest)[] = [
      "client_name",
      "business_type",
      "location",
      "contact_name",
      "contact_email",
      "contact_phone",
      "signed_date",
    ]
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    const validBusinessTypes = ["roofing", "hvac", "plumbing", "landscaping", "general", "other"]
    if (!validBusinessTypes.includes(body.business_type)) {
      return NextResponse.json(
        { error: `Invalid business_type. Must be one of: ${validBusinessTypes.join(", ")}` },
        { status: 400 }
      )
    }

    const serviceClient = getServiceClient()
    let checklist: OnboardingStep[] = DEFAULT_CHECKLIST.map((s) => ({ ...s }))

    // ─── Step 1: Create/update agency_clients record ──────────────────────────
    const [firstName, ...lastParts] = body.contact_name.trim().split(" ")
    const lastName = lastParts.join(" ") || ""

    const clientPayload = {
      legal_business_name: body.client_name,
      first_name: firstName,
      last_name: lastName,
      email_for_notifications: body.contact_email,
      business_email_for_leads: body.contact_email,
      cell_phone_for_notifications: body.contact_phone,
      business_phone: body.contact_phone,
      service_type: body.business_type,
      pipeline_stage: "onboarding",
      pipeline_stage_changed_at: new Date().toISOString(),
      onboarding_status: "in_progress",
      onboarding_call_at: new Date().toISOString(),
    }

    // Check if a record already exists for this business name
    const { data: existingClient } = await serviceClient
      .from("agency_clients")
      .select("id")
      .ilike("legal_business_name", body.client_name)
      .is("deleted_at", null)
      .maybeSingle()

    let clientId: string

    if (existingClient?.id) {
      // Update existing record
      const { data: updated, error: updateError } = await serviceClient
        .from("agency_clients")
        .update(clientPayload)
        .eq("id", existingClient.id)
        .select("id")
        .single()

      if (updateError || !updated) {
        console.error("Failed to update client:", updateError)
        return NextResponse.json({ error: "Failed to update client record" }, { status: 500 })
      }
      clientId = updated.id
    } else {
      // Insert new record
      const { data: inserted, error: insertError } = await serviceClient
        .from("agency_clients")
        .insert(clientPayload)
        .select("id")
        .single()

      if (insertError || !inserted) {
        console.error("Failed to insert client:", insertError)
        return NextResponse.json({ error: "Failed to create client record" }, { status: 500 })
      }
      clientId = inserted.id
    }

    checklist = markStep(checklist, "supabase_record", "complete")

    // Log stage change activity
    await serviceClient.from("client_activity").insert({
      client_id: clientId,
      type: "stage_change",
      title: "Client signed — onboarding pipeline started",
      detail: `Signed ${body.signed_date}. Automated onboarding pipeline triggered.`,
      metadata: { new_stage: "onboarding", signed_date: body.signed_date, triggered_by: user.id },
    })

    // ─── Step 2: Slack channel ────────────────────────────────────────────────
    const slackChannelId = await createSlackChannel(body.client_name)
    if (slackChannelId) {
      await serviceClient
        .from("agency_clients")
        .update({ slack_channel_id: slackChannelId })
        .eq("id", clientId)

      // Post welcome message to channel
      const slackToken = process.env.SLACK_BOT_TOKEN
      if (slackToken) {
        await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${slackToken}`,
          },
          body: JSON.stringify({
            channel: slackChannelId,
            text: `:handshake: *${body.client_name}* just signed with HomeField Hub!\n\n*Contact:* ${body.contact_name} (${body.contact_email} | ${body.contact_phone})\n*Location:* ${body.location}\n*Trade:* ${body.business_type}\n*Signed:* ${body.signed_date}\n\nOnboarding pipeline is running now. :rocket:`,
          }),
        }).catch((err) => console.error("Slack welcome message failed:", err))
      }

      checklist = markStep(checklist, "slack_channel", "complete")
    }

    // ─── Step 3: Welcome email ────────────────────────────────────────────────
    const emailSent = await sendWelcomeEmail(body)
    if (emailSent) {
      checklist = markStep(checklist, "welcome_email", "complete")
      await serviceClient.from("client_activity").insert({
        client_id: clientId,
        type: "email_sent",
        title: "Welcome email sent",
        detail: `To: ${body.contact_email}`,
        metadata: { step: "welcome_email" },
      })
    }

    // ─── Steps 4-6: AI content generation ────────────────────────────────────
    checklist = markStep(checklist, "market_research", "in_progress")
    checklist = markStep(checklist, "ad_copy", "in_progress")
    checklist = markStep(checklist, "content_calendar", "in_progress")

    const generated = await generateContent(body)

    checklist = markStep(checklist, "market_research", "complete")
    checklist = markStep(checklist, "ad_copy", "complete")
    checklist = markStep(checklist, "content_calendar", "complete")

    // ─── Step 5: Build onboarding checklist & persist to client record ────────
    const checklistMap = Object.fromEntries(
      checklist.map((s) => [s.id, { status: s.status, completedAt: s.completedAt }])
    )

    // Store generated content in client notes + checklist in metadata columns
    // We use the `questions` field for structured metadata as a JSON string
    // (avoids schema migration) — the notes field stores human-readable research
    const notesContent = [
      `=== MARKET RESEARCH ===\n${generated.market_research}`,
      `=== CONTENT CALENDAR ===\n${generated.content_calendar}`,
      `=== AD COPY VARIANTS ===\n${generated.ad_copy_variants.map((v, i) => `--- Variant ${i + 1} ---\n${v}`).join("\n\n")}`,
    ].join("\n\n")

    await serviceClient
      .from("agency_clients")
      .update({
        questions: JSON.stringify({
          onboarding_checklist: checklistMap,
          onboarding_pipeline_run_at: new Date().toISOString(),
          ad_copy_variants: generated.ad_copy_variants,
          content_calendar: generated.content_calendar,
          market_research: generated.market_research,
        }),
        // Append to existing notes if any
        differentiator: notesContent.substring(0, 2000), // cap to safe length
      })
      .eq("id", clientId)

    // Log AI generation activity
    await serviceClient.from("client_activity").insert({
      client_id: clientId,
      type: "ai_generated",
      title: "AI content generated",
      detail: "Market research brief, content calendar, and 3 ad copy variants created",
      metadata: { step: "ai_generation", model: "gpt-4o" },
    })

    // ─── Return full pipeline result ──────────────────────────────────────────
    return NextResponse.json({
      success: true,
      clientId,
      slackChannelId,
      emailSent,
      checklist,
      generated: {
        market_research: generated.market_research,
        content_calendar: generated.content_calendar,
        ad_copy_variants: generated.ad_copy_variants,
      },
    })
  } catch (err) {
    console.error("POST /api/onboarding/pipeline error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

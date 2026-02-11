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
    const { to, subject, body: emailBody } = body

    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { error: "Recipient email (to) is required" },
        { status: 400 }
      )
    }

    if (!subject || typeof subject !== "string") {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      )
    }

    if (!emailBody || typeof emailBody !== "string") {
      return NextResponse.json(
        { error: "Email body is required" },
        { status: 400 }
      )
    }

    // Verify client exists
    const { data: client, error: clientError } = await supabase
      .from("agency_clients")
      .select("legal_business_name")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Send via Resend API
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json(
        { error: "Email integration not configured" },
        { status: 500 }
      )
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "HomeField Hub <no-reply@homefieldhub.com>",
        to: [to.trim()],
        subject: subject.trim(),
        html: emailBody,
      }),
    })

    const resendResult = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendResult)
      return NextResponse.json(
        { error: resendResult.message ?? "Failed to send email" },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from("client_activity").insert({
      client_id: id,
      type: "email_sent",
      title: `Email sent: ${subject.trim()}`,
      detail: `To: ${to.trim()}`,
      metadata: {
        resend_id: resendResult.id,
        to: to.trim(),
        subject: subject.trim(),
      },
    })

    return NextResponse.json({ success: true, emailId: resendResult.id })
  } catch (err) {
    console.error("POST /api/portal/admin/clients/[id]/email error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

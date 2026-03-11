import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createDemoBookingEvent, isCalendarConnected } from "@/lib/google-calendar"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * POST /api/demo/book
 * 
 * Accepts demo booking form data, saves to demo_leads table,
 * and creates a Google Calendar event if connected.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      phone,
      email,
      projectType,
      homeAge,
      timeline,
      budget,
      paymentMethod,
      address,
      company,
      notes,
      scheduledAt, // ISO string, e.g. "2025-03-15T14:00:00Z"
    } = body

    // 1. Save to Supabase demo_leads table
    const { data: lead, error: dbError } = await supabase
      .from("demo_leads")
      .insert({
        project_type: projectType || null,
        home_age: homeAge || null,
        timeline: timeline || null,
        budget: budget || null,
        payment_method: paymentMethod || null,
        address: address || null,
        name: name || null,
        phone: phone || null,
        email: email || null,
        company: company || null,
        notes: notes || null,
        scheduled_at: scheduledAt || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      console.error("Supabase demo_leads insert error:", dbError)
      // Non-fatal — continue to calendar creation
    }

    // 2. Create Google Calendar event if connected
    let calendarEventId: string | null = null

    const connected = await isCalendarConnected()
    if (connected) {
      // Default to 30-minute call starting now (or at scheduledAt)
      const startTime = scheduledAt
        ? new Date(scheduledAt)
        : new Date()
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000) // +30 min

      calendarEventId = await createDemoBookingEvent({
        clientName: name || "Unknown",
        phone: phone || "",
        company: company,
        email: email,
        notes: [
          projectType && `Project: ${projectType}`,
          homeAge && `Home Age: ${homeAge}`,
          timeline && `Timeline: ${timeline}`,
          budget && `Budget: ${budget}`,
          paymentMethod && `Payment: ${paymentMethod}`,
          address && `Address: ${address}`,
          notes,
        ]
          .filter(Boolean)
          .join("\n") || undefined,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })

      // 3. Save calendar event ID back to Supabase if we have the lead ID
      if (calendarEventId && lead?.id) {
        await supabase
          .from("demo_leads")
          .update({ google_calendar_event_id: calendarEventId })
          .eq("id", lead.id)
      }
    }

    return NextResponse.json({
      success: true,
      leadId: lead?.id || null,
      calendarEventCreated: !!calendarEventId,
      calendarEventId,
    })
  } catch (error) {
    console.error("Demo booking error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process booking" },
      { status: 500 }
    )
  }
}

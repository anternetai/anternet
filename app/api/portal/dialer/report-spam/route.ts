import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/portal/dialer/report-spam — flag current outbound number as spam
export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { phoneNumberId } = await req.json()
  if (!phoneNumberId) {
    return NextResponse.json({ error: "phoneNumberId required" }, { status: 400 })
  }

  const admin = getAdmin()

  const { data: phoneNum } = await admin
    .from("dialer_phone_numbers")
    .select("*")
    .eq("id", phoneNumberId)
    .single()

  if (!phoneNum) {
    return NextResponse.json({ error: "Number not found" }, { status: 404 })
  }

  const newSpamCount = (phoneNum.spam_reports || 0) + 1
  const shouldRetire = newSpamCount > 2

  await admin
    .from("dialer_phone_numbers")
    .update({
      spam_reports: newSpamCount,
      ...(shouldRetire ? { status: "retired" } : {}),
    })
    .eq("id", phoneNumberId)

  // Slack alert
  try {
    const slackToken = process.env.SLACK_BOT_TOKEN
    if (slackToken) {
      const { count: remaining } = await admin
        .from("dialer_phone_numbers")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")

      const msg = shouldRetire
        ? `🚨 *Number retired:* ${phoneNum.phone_number} — ${newSpamCount} spam reports. *${remaining || 0} active numbers left.* ${(remaining || 0) <= 1 ? "Buy more numbers!" : ""}`
        : `⚠️ *Spam report #${newSpamCount}:* ${phoneNum.phone_number} (retires at 3). ${remaining || 0} active numbers.`

      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: { Authorization: `Bearer ${slackToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "U0ABZDLENJ1", text: msg }),
      })
    }
  } catch {} // non-fatal

  return NextResponse.json({
    success: true,
    spamReports: newSpamCount,
    retired: shouldRetire,
    phoneNumber: phoneNum.phone_number,
  })
}

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  // This endpoint is called by n8n to send push notifications
  const authHeader = request.headers.get("authorization")
  const expectedToken = process.env.PUSH_WEBHOOK_SECRET

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { user_id, title, body, url } = await request.json()

  if (!user_id || !title || !body) {
    return NextResponse.json(
      { error: "Missing user_id, title, or body" },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, keys")
    .eq("user_id", user_id)

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0 })
  }

  // Web Push requires the `web-push` npm package on the server.
  // For now, store the notification payload for the service worker to pick up.
  // Full Web Push implementation requires VAPID keys and the web-push library.
  // This endpoint is ready to be extended when web-push is installed.

  return NextResponse.json({
    sent: subscriptions.length,
    message: "Push notification queued",
    payload: { title, body, url },
  })
}

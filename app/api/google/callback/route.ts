import { NextRequest, NextResponse } from "next/server"
import { getTokensFromCode } from "@/lib/google-calendar"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")

  if (!code) {
    return NextResponse.json({ error: "No authorization code received" }, { status: 400 })
  }

  try {
    const tokens = await getTokensFromCode(code)

    // Display the refresh token so Anthony can add it to Vercel env vars
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Google Calendar Connected</title></head>
        <body style="font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 20px;">
          <h1 style="color: #3A6B4C;">Google Calendar Connected!</h1>
          <p>Add this refresh token to your Vercel environment variables as <code>GOOGLE_REFRESH_TOKEN</code>:</p>
          <pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; word-break: break-all; white-space: pre-wrap;">${tokens.refresh_token}</pre>
          <p style="color: #666; font-size: 14px;">Once added, redeploy and calendar sync will be active.</p>
          <p style="color: #666; font-size: 14px;">You can now close this page.</p>
        </body>
      </html>
    `

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: "Failed to exchange code", details: message }, { status: 500 })
  }
}

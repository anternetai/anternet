import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const correct = process.env.CRM_PASSWORD

  if (!correct || password !== correct) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set("crm_auth", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/crm",
  })
  return res
}

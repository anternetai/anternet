import { NextResponse } from "next/server"

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set("crm_auth", "", { maxAge: 0, path: "/crm" })
  return res
}

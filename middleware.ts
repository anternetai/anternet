import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CRM auth gate — protect all /crm routes except /crm/login
  if (pathname.startsWith("/crm") && !pathname.startsWith("/crm/login")) {
    const crmAuth = request.cookies.get("crm_auth")
    if (!crmAuth || crmAuth.value !== "1") {
      const loginUrl = new URL("/crm/login", request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    "/portal/:path*",
    "/api/portal/:path*",
    "/crm/:path*",
  ],
}

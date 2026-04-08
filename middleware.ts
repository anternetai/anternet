import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Markdown mirror — rewrite .md URLs to API handler
  if (pathname.endsWith(".md")) {
    const cleanPath = pathname.slice(0, -3) || "/"
    return NextResponse.rewrite(
      new URL(`/api/llms/md?path=${encodeURIComponent(cleanPath)}`, request.url)
    )
  }

  // Redirect deprecated Power Dialer to Cold Call Cockpit
  if (pathname === "/portal/admin/calls") {
    return NextResponse.redirect(new URL("/portal/cold-calls", request.url))
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    "/portal/:path*",
    "/api/portal/:path*",
    "/((?!_next|api|favicon).*\\.md)",
  ],
}

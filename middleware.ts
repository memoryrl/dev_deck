import { type NextRequest, NextResponse } from "next/server"
import { applyLocaleCookie } from "@/lib/i18n/middleware"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (path === "/api/health" || path.startsWith("/api/cron/")) {
    return NextResponse.next()
  }
  const response = await updateSession(request)
  return applyLocaleCookie(request, response)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

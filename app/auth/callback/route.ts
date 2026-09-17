import { getRequestOrigin } from "@/lib/auth/app-url"
import { recordLoginHistory, recordPageView } from "@/lib/auth/login-history"
import { postLoginPath } from "@/lib/auth/roles"
import { VISIT_ID_COOKIE, VISIT_LOG_COOKIE, visitLogCookieOptions } from "@/lib/auth/visit-window"
import { clientIpFromHeaders, resolveIpRegion } from "@/lib/comments/ip"
import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = getRequestOrigin(request)
  const code = searchParams.get("code")
  let user: { email?: string | null } | null = null
  let visitId: string | null = null
  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser()
    user = sessionUser

    if (sessionUser) {
      // 로그인 기록은 부가 기능이다 — 실패해도 로그인/리다이렉트 자체는 막지 않는다.
      try {
        const ip = clientIpFromHeaders()
        const region = await resolveIpRegion(ip)
        visitId = await recordLoginHistory({
          userId: sessionUser.id,
          email: sessionUser.email ?? null,
          provider: (sessionUser.app_metadata?.provider as string | undefined) ?? null,
          ipAddress: ip,
          ipRegion: region,
          userAgent: headers().get("user-agent"),
        })
        // 이 로그인 행이 곧 세션이다 — 로그인 직후 이동할 페이지를 첫 페이지뷰로 남긴다.
        if (visitId) await recordPageView({ visitId, path: postLoginPath(user) })
      } catch {
        // 무시 — 로그인 이력 저장 실패가 로그인 흐름을 막지 않는다
      }
    }
  }
  const response = NextResponse.redirect(`${origin}${postLoginPath(user)}`)
  // 방금 로그인을 남겼으면 이어지는 랜딩 접속 기록은 같은 세션으로 본다.
  if (user) {
    response.cookies.set(VISIT_LOG_COOKIE, "1", visitLogCookieOptions())
    if (visitId) response.cookies.set(VISIT_ID_COOKIE, visitId, visitLogCookieOptions())
  }
  return response
}

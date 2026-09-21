import { getRequestOrigin } from "@/lib/auth/app-url"
import { recordLoginHistory, recordPageView } from "@/lib/auth/login-history"
import { postLoginPath } from "@/lib/auth/roles"
import { VISIT_ID_COOKIE, VISIT_LOG_COOKIE, visitLogCookieOptions } from "@/lib/auth/visit-window"
import { clientIpFromHeaders, resolveIpRegion } from "@/lib/comments/ip"
import { createClient, upsertProfile } from "@/lib/supabase/server"
import { isOwnerUser } from "@/lib/auth/roles"
import { recordTermsConsent, termsGatePath } from "@/lib/terms/consent"
import { parseSignupConsent, SIGNUP_CONSENT_COOKIE } from "@/lib/terms/signup-consent"
import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = getRequestOrigin(request)
  const code = searchParams.get("code")
  let user: { email?: string | null } | null = null
  let visitId: string | null = null
  let destination: string | null = null
  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser()
    user = sessionUser

    if (sessionUser) {
      // devdeck.profiles는 로그인 시점에 딱 한 번만 upsert한다 — 예전엔 대시보드
      // 페이지마다(ensureProfile) 매번 다시 했는데, 그게 페이지 전환마다 겹치는
      // 지연의 큰 부분이었다. 로그인 기록과 마찬가지로 실패해도 로그인 자체는 막지 않는다.
      try {
        await upsertProfile(sessionUser)
      } catch {
        // 무시
      }
      // 로그인 화면의 "회원가입" 탭에서 약관 두 개에 이미 체크하고 왔다면 그 동의를 여기서 바로 기록한다.
      // 그러면 아래 약관 게이트를 건너뛰고 곧장 가입이 끝난다. 로그인 탭으로 처음 들어온 사람은 쿠키가
      // 없으므로 기존처럼 약관 확인 화면을 거친다.
      const preConsent = (await cookies()).get(SIGNUP_CONSENT_COOKIE)?.value
      const preVersions = parseSignupConsent(preConsent)
      if (preVersions && !isOwnerUser(sessionUser)) {
        try {
          await recordTermsConsent({
            userId: sessionUser.id,
            versions: preVersions,
            ipAddress: await clientIpFromHeaders(),
            userAgent: (await headers()).get("user-agent"),
          })
        } catch {
          // 기록에 실패하면 아래 게이트가 약관 확인 화면으로 보내 다시 받는다
        }
      }
      // 첫 로그인(=회원가입)이면 이용약관·개인정보처리방침을 확인하는 화면을 먼저 거친다.
      // 두 약관을 모두 확인하기 전까지는 마이페이지도 그 화면으로 되돌린다.
      destination = await termsGatePath(sessionUser)
      // 로그인 기록은 부가 기능이다 — 실패해도 로그인/리다이렉트 자체는 막지 않는다.
      try {
        const ip = await clientIpFromHeaders()
        const region = await resolveIpRegion(ip)
        visitId = await recordLoginHistory({
          userId: sessionUser.id,
          email: sessionUser.email ?? null,
          provider: (sessionUser.app_metadata?.provider as string | undefined) ?? null,
          ipAddress: ip,
          ipRegion: region,
          userAgent: (await headers()).get("user-agent"),
        })
        // 이 로그인 행이 곧 세션이다 — 로그인 직후 이동할 페이지를 첫 페이지뷰로 남긴다.
        if (visitId) await recordPageView({ visitId, path: destination ?? postLoginPath(user) })
      } catch {
        // 무시 — 로그인 이력 저장 실패가 로그인 흐름을 막지 않는다
      }
    }
  }
  const response = NextResponse.redirect(`${origin}${destination ?? postLoginPath(user)}`)
  // 방금 로그인을 남겼으면 이어지는 랜딩 접속 기록은 같은 세션으로 본다.
  // 한 번 쓴 가입 동의 쿠키는 남기지 않는다.
  response.cookies.delete(SIGNUP_CONSENT_COOKIE)
  if (user) {
    response.cookies.set(VISIT_LOG_COOKIE, "1", visitLogCookieOptions())
    if (visitId) response.cookies.set(VISIT_ID_COOKIE, visitId, visitLogCookieOptions())
  }
  return response
}

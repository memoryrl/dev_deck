import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"
import { findRecentSessionId, recordPageView, recordVisitHistory } from "@/lib/auth/login-history"
import { VISIT_ID_COOKIE, VISIT_LOG_COOKIE, visitLogCookieOptions } from "@/lib/auth/visit-window"
import { clientIpFromHeaders, resolveIpRegion } from "@/lib/comments/ip"
import { getAuthUser } from "@/lib/supabase/server"
import { checkRateLimit } from "@/lib/uploads/rate-limit"
import { isSupabaseConfigured } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function jsonWithVisitCookies(body: object, visitId: string | null) {
  const res = NextResponse.json(body)
  res.cookies.set(VISIT_LOG_COOKIE, "1", visitLogCookieOptions())
  if (visitId) res.cookies.set(VISIT_ID_COOKIE, visitId, visitLogCookieOptions())
  return res
}

async function readPath(request: Request) {
  try {
    const body = await request.json()
    if (typeof body?.path === "string") return body.path.slice(0, 500)
  } catch {
    // 바디 없이 호출된 경우도 있다(구버전 클라이언트) — 기본값으로 처리
  }
  return "/"
}

// 세션(login_history 행)을 만들거나 재사용하고, 그 세션의 첫 페이지뷰를 기록한다.
// 이후 같은 세션의 페이지 이동은 이 라우트를 다시 타지 않고 훨씬 가벼운
// /api/track-pageview로 간다(dd_visit_id 쿠키가 있을 때) — docs/10-login-history.md.
export async function POST(request: Request) {
  const ip = clientIpFromHeaders()
  // 세션당 한 번만 타는 라우트다(재사용 가능하면 곧장 반환). 쿠키가 없는
  // 반복 호출(스크립트성 플러딩)로부터 외부 지역조회 API·DB insert를 보호한다.
  if (!checkRateLimit(`track-visit:${ip}`, 15, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 })
  }

  const jar = cookies()
  const path = await readPath(request)

  if (jar.get(VISIT_LOG_COOKIE)) {
    // 쿠키 레이스 등으로 세션은 이미 있는데 여기로 온 경우 — 페이지뷰만 남긴다.
    const existingId = jar.get(VISIT_ID_COOKIE)?.value ?? null
    if (existingId) await recordPageView({ visitId: existingId, path }).catch(() => {})
    return NextResponse.json({ skipped: true })
  }

  if (!isSupabaseConfigured()) return jsonWithVisitCookies({ ok: false }, null)

  try {
    const user = await getAuthUser()

    const recentId = await findRecentSessionId({ userId: user?.id ?? null, ipAddress: ip })
    if (recentId) {
      await recordPageView({ visitId: recentId, path })
      return jsonWithVisitCookies({ skipped: true }, recentId)
    }

    const region = await resolveIpRegion(ip)
    const visitId = await recordVisitHistory({
      userId: user?.id ?? null,
      email: user?.email ?? null,
      provider: (user?.app_metadata?.provider as string | undefined) ?? null,
      ipAddress: ip,
      ipRegion: region,
      userAgent: headers().get("user-agent"),
    })
    if (visitId) await recordPageView({ visitId, path })
    return jsonWithVisitCookies({ ok: true }, visitId)
  } catch {
    return jsonWithVisitCookies({ ok: false }, null)
  }
}

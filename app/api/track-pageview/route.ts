import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { recordPageView } from "@/lib/auth/login-history"
import { VISIT_ID_COOKIE } from "@/lib/auth/visit-window"
import { clientIpFromHeaders } from "@/lib/comments/ip"
import { checkRateLimit } from "@/lib/uploads/rate-limit"
import { isSupabaseConfigured } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// 이미 세션이 있을 때(dd_visit_id 쿠키 존재)만 쓰는 가벼운 경로. 지역 조회 없이
// insert 한 줄뿐이다 — docs/10-login-history.md 3.1절(성능 근거) 참고.
// navigator.sendBeacon으로 호출되므로 body가 Blob(JSON 문자열)으로 온다.
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false })

  const visitId = (await cookies()).get(VISIT_ID_COOKIE)?.value
  if (!visitId) return NextResponse.json({ skipped: true })

  // 정상적인 탐색이면 페이지 이동마다 한 번이라 넉넉하게 잡아도 충분하다 —
  // 스크립트성 플러딩으로 page_views가 무한정 쌓이는 것만 막는다.
  const ip = await clientIpFromHeaders()
  if (!checkRateLimit(`track-pageview:${ip}`, 120, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 })
  }

  let path = "/"
  try {
    const body = await request.json()
    if (typeof body?.path === "string") path = body.path.slice(0, 500)
  } catch {
    return NextResponse.json({ skipped: true })
  }

  try {
    await recordPageView({ visitId, path })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}

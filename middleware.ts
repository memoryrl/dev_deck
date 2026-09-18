import { type NextRequest, NextResponse } from "next/server"
import { applyLocaleCookie } from "@/lib/i18n/middleware"
import { updateSession } from "@/lib/supabase/middleware"

// dev 모드에선 webpack HMR이 eval()로 모듈을 감싸서 로드하기 때문에 nonce 기반
// CSP를 걸면 스크립트가 전부 막혀 화면이 빈다 — 그래서 production에서만 켠다.
// 인라인 <script>는 이 저장소 어디에도 없고(Next가 자체 생성하는 RSC 하이드레이션
// 스크립트뿐), Next는 이 CSP 응답 헤더에서 nonce를 직접 읽어 자기 스크립트에
// 붙여준다 — 별도로 x-nonce를 요청 헤더에 실어 보낼 필요가 없다.
function buildCsp(nonce: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self'",
    `connect-src 'self'${supabaseUrl ? ` ${supabaseUrl}` : ""}`,
    "frame-src https://cdn.21st.dev https://my.spline.design",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]
  return directives.join("; ")
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (path === "/api/health" || path.startsWith("/api/cron/")) {
    return NextResponse.next()
  }

  request.headers.set("x-pathname", path)

  let csp: string | null = null
  if (process.env.NODE_ENV === "production") {
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
    csp = buildCsp(nonce)
    // Next는 자신의 하이드레이션 인라인 스크립트에 붙일 nonce를 "요청" 헤더의
    // CSP에서 읽는다(응답 헤더는 브라우저만 본다) — updateSession()이 내부에서
    // NextResponse.next({ request })로 이 request를 그대로 이어받으므로, 여기서
    // 미리 헤더를 채워두면 그 안쪽 호출까지 전부 전달된다.
    request.headers.set("Content-Security-Policy", csp)
  }

  const response = await updateSession(request)
  const finalResponse = applyLocaleCookie(request, response)

  if (csp) finalResponse.headers.set("Content-Security-Policy", csp)

  return finalResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

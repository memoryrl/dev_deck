import { type NextRequest, NextResponse } from "next/server"
import { applyLocaleCookie } from "@/lib/i18n/middleware"
import { updateSession } from "@/lib/supabase/middleware"

// dev 모드에선 webpack HMR이 eval()로 모듈을 감싸서 로드하기 때문에 nonce 기반
// CSP를 걸면 스크립트가 전부 막혀 화면이 빈다 — 그래서 production에서만 켠다.
// Next는 요청 헤더의 x-nonce / CSP 에서 nonce를 읽어 RSC 하이드레이션 스크립트에
// 붙인다. next-themes·GA 인라인 스크립트는 layout에서 같은 nonce를 넘겨야 한다.
// wasm-unsafe-eval 은 JS eval이 아니라 WebAssembly 컴파일용(Three.js / CKEditor).
function buildCsp(nonce: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval' https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self'",
    `connect-src 'self'${supabaseUrl ? ` ${supabaseUrl}` : ""} https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://analytics.google.com`,
    "frame-src https://cdn.21st.dev https://my.spline.design",
    "worker-src 'self' blob:",
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
    // Next는 자신의 하이드레이션 인라인 스크립트에 붙일 nonce를 "요청" 헤더에서
    // 읽는다(응답 헤더는 브라우저만 본다). updateSession()이 NextResponse.next({ request })
    // 로 이 request를 이어받으므로, 여기서 미리 채워 둔다.
    request.headers.set("x-nonce", nonce)
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

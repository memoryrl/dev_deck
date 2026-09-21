import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isOwnerUser, postLoginPath } from "@/lib/auth/roles"
import { isInvalidRefreshError, isSupabaseAuthCookie } from "@/lib/supabase/auth-error"

// 이 경로들만 로그인 여부로 리다이렉트가 갈린다 — 그 외(랜딩, /work, /games, /p/[id],
// /b/[slug] 등 공개 페이지)는 미들웨어 단계에서 로그인 정보가 아예 필요 없다.
// getUser()는 Supabase Auth 서버로 매번 네트워크 왕복하는 호출이라, 전에는 이걸
// 모든 요청(공개 페이지 포함)에 걸어서 페이지 전환마다 불필요한 지연이 있었다.
// 다만 브라우저에 만료·폐기된 refresh token 쿠키가 남아 있으면 공개 페이지의
// getUser()가 같은 400을 반복해서 찍으므로, 인증 쿠키가 있을 때만 여기서 한 번
// 검증하고 잘못된 쿠키는 지운다.
function needsAuthCheck(path: string) {
  return (
    path.startsWith("/promptkit") ||
    path.startsWith("/career") ||
    path.startsWith("/steam") ||
    path.startsWith("/site") ||
    path === "/account" ||
    path === "/login"
  )
}

function hasAuthCookies(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => isSupabaseAuthCookie(cookie.name))
}

function expireAuthCookies(request: NextRequest, response: NextResponse) {
  for (const { name } of request.cookies.getAll()) {
    if (!isSupabaseAuthCookie(name)) continue
    request.cookies.delete(name)
    response.cookies.set({
      name,
      value: "",
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
    })
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const path = request.nextUrl.pathname
  // 방문 기록 API는 본문에서 필요하면 getAuthUser()를 따로 한다. 미들웨어까지
  // 리프레시하면 랜딩 문서 요청과 refresh token을 두고 경쟁한다.
  if (path.startsWith("/api/track-visit") || path.startsWith("/api/track-pageview")) {
    return response
  }
  if (!hasAuthCookies(request) && !needsAuthCheck(path)) return response

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    db: { schema: "devdeck" },
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
      ) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
        )
      },
    },
  })

  let user = null
  let error = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
    error = result.error
  } catch (thrown) {
    error = thrown instanceof Error ? thrown : new Error(String(thrown))
  }

  if (isInvalidRefreshError(error)) {
    expireAuthCookies(request, response)
  }

  const isDashboard =
    path.startsWith("/promptkit") ||
    path.startsWith("/career") ||
    path.startsWith("/steam") ||
    path.startsWith("/site")

  if (isDashboard && !user) {
    const login = request.nextUrl.clone()
    login.pathname = "/login"
    const redirect = NextResponse.redirect(login)
    if (isInvalidRefreshError(error)) expireAuthCookies(request, redirect)
    return redirect
  }

  if (isDashboard && user && !isOwnerUser(user)) {
    const account = request.nextUrl.clone()
    account.pathname = "/account"
    return NextResponse.redirect(account)
  }

  if (path === "/account" && !user) {
    const login = request.nextUrl.clone()
    login.pathname = "/login"
    const redirect = NextResponse.redirect(login)
    if (isInvalidRefreshError(error)) expireAuthCookies(request, redirect)
    return redirect
  }

  if (path === "/login" && user) {
    const dest = request.nextUrl.clone()
    dest.pathname = postLoginPath(user)
    return NextResponse.redirect(dest)
  }

  return response
}

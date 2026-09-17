import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isOwnerUser, postLoginPath } from "@/lib/auth/roles"

// 이 경로들만 로그인 여부로 리다이렉트가 갈린다 — 그 외(랜딩, /work, /games, /p/[id],
// /b/[slug] 등 공개 페이지)는 미들웨어 단계에서 로그인 정보가 아예 필요 없다.
// getUser()는 Supabase Auth 서버로 매번 네트워크 왕복하는 호출이라, 전에는 이걸
// 모든 요청(공개 페이지 포함)에 걸어서 페이지 전환마다 불필요한 지연이 있었다.
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

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const path = request.nextUrl.pathname
  if (!needsAuthCheck(path)) return response

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isDashboard =
    path.startsWith("/promptkit") ||
    path.startsWith("/career") ||
    path.startsWith("/steam") ||
    path.startsWith("/site")

  if (isDashboard && !user) {
    const login = request.nextUrl.clone()
    login.pathname = "/login"
    return NextResponse.redirect(login)
  }

  if (isDashboard && user && !isOwnerUser(user)) {
    const account = request.nextUrl.clone()
    account.pathname = "/account"
    return NextResponse.redirect(account)
  }

  if (path === "/account" && !user) {
    const login = request.nextUrl.clone()
    login.pathname = "/login"
    return NextResponse.redirect(login)
  }

  if (path === "/login" && user) {
    const dest = request.nextUrl.clone()
    dest.pathname = postLoginPath(user)
    return NextResponse.redirect(dest)
  }

  return response
}

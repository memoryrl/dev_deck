import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isOwnerUser, postLoginPath } from "@/lib/auth/roles"

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

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

  const path = request.nextUrl.pathname
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

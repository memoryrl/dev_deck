import { createServerClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { cache } from "react"
import { usernameFromAuth } from "@/lib/auth/session-user"
import { isConsumedRefreshError, isInvalidRefreshError } from "@/lib/supabase/auth-error"

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "devdeck" },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component cannot set cookies. Middleware refreshes the session.
          }
        },
      },
    }
  )
}

export const getAuthUser = cache(async () => {
  const supabase = createClient()
  try {
    const { data, error } = await supabase.auth.getUser()
    if (isConsumedRefreshError(error)) {
      const { data: sessionData } = await supabase.auth.getSession()
      return sessionData.session?.user ?? data.user ?? null
    }
    if (isInvalidRefreshError(error)) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {})
      return null
    }
    return data.user ?? null
  } catch (error) {
    const thrown = error instanceof Error ? error : null
    if (isConsumedRefreshError(thrown)) {
      const { data: sessionData } = await supabase.auth.getSession()
      return sessionData.session?.user ?? null
    }
    if (isInvalidRefreshError(thrown)) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {})
    }
    return null
  }
})

// devdeck.profiles 행을 만들거나 최신화한다. 로그인 시 딱 한 번(app/auth/callback/route.ts)
// 호출하면 충분하다 — 예전엔 대시보드 페이지마다 ensureProfile()이 이 upsert까지 매번
// 다시 실행해서, 페이지 이동 한 번에 getUser() 왕복 2번(미들웨어+페이지) + 쓰기 1번이
// 겹겹이 쌓였다. 읽기보다 쓰기가 느리므로 이게 체감 지연의 큰 부분이었다.
export async function upsertProfile(user: User) {
  const supabase = createClient()
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name:
        (user.user_metadata.full_name as string | undefined) ??
        (user.user_metadata.name as string | undefined) ??
        null,
      avatar_url: (user.user_metadata.avatar_url as string | undefined) ?? null,
      username: usernameFromAuth(user),
    },
    { onConflict: "id" }
  )
}

// 대시보드 페이지들이 "로그인돼 있나" 확인하는 용도로 쓴다(미들웨어가 이미 한 번
// 걸러주지만 페이지 자체에서도 user 객체가 필요한 곳이 있다). React cache()로 감싸서
// 같은 요청 안에서 여러 번 불려도 실제 네트워크 호출은 한 번만 나간다. 프로필 upsert는
// 더 이상 여기서 하지 않는다 — 로그인 시점에 upsertProfile()로 한 번만 하면 된다.
export const ensureProfile = getAuthUser

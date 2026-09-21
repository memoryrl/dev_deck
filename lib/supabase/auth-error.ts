import type { AuthError } from "@supabase/supabase-js"

function errorParts(error: AuthError | Error | null | undefined) {
  if (!error) return { code: "", message: "" }
  const code = "code" in error ? String(error.code ?? "") : ""
  const message = error.message ?? ""
  return { code, message }
}

// 같은 탭에서 페이지+방문기록 API가 동시에 getUser()를 치면, 한쪽이 리프레시
// 토큰을 이미 소모한 뒤 다른 쪽이 이 오류를 받는다. 세션은 살아 있고 새 쿠키는
// 성공한 응답에 실려 있으므로, 여기서 쿠키를 지우면 방금 로그인한 사용자가
// 랜딩으로 가는 순간 로그아웃된다.
export function isConsumedRefreshError(error: AuthError | Error | null | undefined) {
  const { code, message } = errorParts(error)
  return (
    code === "refresh_token_already_used" ||
    /refresh token already used/i.test(message)
  )
}

export function isInvalidRefreshError(error: AuthError | Error | null | undefined) {
  if (!error || isConsumedRefreshError(error)) return false
  const { code, message } = errorParts(error)
  return (
    code === "refresh_token_not_found" ||
    code === "session_not_found" ||
    /invalid refresh token|refresh token not found/i.test(message)
  )
}

export function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && name.includes("-auth-")
}

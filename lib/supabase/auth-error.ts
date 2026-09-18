import type { AuthError } from "@supabase/supabase-js"

export function isInvalidRefreshError(error: AuthError | Error | null | undefined) {
  if (!error) return false
  const code = "code" in error ? String(error.code ?? "") : ""
  const message = error.message ?? ""
  return (
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    code === "session_not_found" ||
    /invalid refresh token|refresh token not found/i.test(message)
  )
}

export function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && name.includes("-auth-")
}

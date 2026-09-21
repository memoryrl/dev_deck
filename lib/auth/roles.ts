export const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "memoryrl@gmail.com").trim().toLowerCase()

export function isOwnerEmail(email?: string | null) {
  return Boolean(email && email.trim().toLowerCase() === OWNER_EMAIL)
}

type OwnerCandidate = {
  id?: string
  email?: string | null
  app_metadata?: { provider?: string; providers?: string[] } | null
}

/**
 * 관리자 판별. 이메일이 같다는 것만으로는 부족하다 — 이메일 확인 없는 가입 등으로 같은 이메일의 다른 계정이
 * 생길 수 있기 때문이다. 그래서
 *  - 로그인 수단에 Google 이 포함된 계정만 인정하고(이메일·비밀번호 가입 계정 제외),
 *  - OWNER_USER_ID 를 설정하면 그 사용자 UUID 와도 일치해야 한다(DB 의 devdeck.app_owner 와 같은 값).
 * DB(RLS)는 devdeck.app_owner 로 UUID 를 고정해서 판별하고, 서버 코드도 같은 기준을 쓰도록 맞춘 것이다.
 * 로그인 사용자 전체 객체(supabase User)를 넘겨야 provider/id 를 확인할 수 있다.
 */
export function isOwnerUser(user: OwnerCandidate | null | undefined) {
  if (!user || !isOwnerEmail(user.email)) return false

  const pinned = process.env.OWNER_USER_ID?.trim()
  if (pinned && user.id !== pinned) return false

  const meta = user.app_metadata
  const providers = meta?.providers ?? (meta?.provider ? [meta.provider] : null)
  if (providers && !providers.includes("google")) return false

  return true
}

export function postLoginPath(user: OwnerCandidate | null | undefined) {
  return isOwnerUser(user) ? "/site/dashboard" : "/account"
}

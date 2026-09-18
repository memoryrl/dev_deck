import { accessRoleOf, type AccessRole } from "@/lib/access"

export type SessionUserView = {
  name: string
  email: string
  avatarUrl: string | null
  role: AccessRole
  isOwner: boolean
}

export function sessionUserView(user: {
  email?: string | null
  user_metadata?: Record<string, unknown>
}): SessionUserView {
  const meta = user.user_metadata ?? {}
  const name =
    stringMeta(meta.full_name) ?? stringMeta(meta.name) ?? user.email?.trim() ?? "회원"
  const avatarUrl = stringMeta(meta.avatar_url) ?? stringMeta(meta.picture)
  const role = accessRoleOf(user)

  return {
    name,
    email: user.email?.trim() ?? "",
    avatarUrl,
    role,
    isOwner: role === "owner",
  }
}

/** Google은 user_name을 안 준다. OAuth 핸들이 없으면 이메일 로컬파트를 쓴다. */
export function usernameFromAuth(user: {
  email?: string | null
  user_metadata?: Record<string, unknown>
}) {
  const meta = user.user_metadata ?? {}
  const fromMeta = stringMeta(meta.user_name) ?? stringMeta(meta.preferred_username)
  if (fromMeta) return fromMeta
  const local = user.email?.trim().split("@")[0]?.trim()
  return local || null
}

function stringMeta(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

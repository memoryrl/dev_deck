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

function stringMeta(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

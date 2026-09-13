import { isOwnerUser } from "@/lib/auth/roles"

export type AccessRole = "visitor" | "member" | "owner"

export const ACCESS_ROLES: AccessRole[] = ["visitor", "member", "owner"]

const RANK: Record<AccessRole, number> = {
  visitor: 0,
  member: 1,
  owner: 2,
}

export function accessRoleOf(user: { email?: string | null } | null | undefined): AccessRole {
  if (!user) return "visitor"
  if (isOwnerUser(user)) return "owner"
  return "member"
}

export function roleAtLeast(current: AccessRole, required: AccessRole) {
  return RANK[current] >= RANK[required]
}

export function roleLabel(role: AccessRole) {
  if (role === "owner") return "관리자"
  if (role === "member") return "회원"
  return "방문객"
}

export function boardPath(slug: string) {
  return `/b/${slug}`
}

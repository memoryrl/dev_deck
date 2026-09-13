export const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "memoryrl@gmail.com").trim().toLowerCase()

export function isOwnerEmail(email?: string | null) {
  return Boolean(email && email.trim().toLowerCase() === OWNER_EMAIL)
}

export function isOwnerUser(user: { email?: string | null } | null | undefined) {
  return isOwnerEmail(user?.email)
}

export function postLoginPath(user: { email?: string | null } | null | undefined) {
  return isOwnerUser(user) ? "/promptkit" : "/account"
}

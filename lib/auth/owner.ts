import { isOwnerUser } from "@/lib/auth/roles"
import { ensureProfile } from "@/lib/supabase/server"

export { isOwnerEmail, isOwnerUser, postLoginPath, OWNER_EMAIL } from "@/lib/auth/roles"

export async function requireOwner() {
  const user = await ensureProfile()
  if (!user) throw new Error("로그인이 필요합니다.")
  if (!isOwnerUser(user)) {
    throw new Error("관리자만 게시물을 편집할 수 있습니다.")
  }
  return user
}

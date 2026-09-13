import { accessRoleOf, roleAtLeast, type AccessRole } from "@/lib/access"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Board, SystemBoardKind } from "@/types/board"

export async function currentAccessRole(): Promise<AccessRole> {
  if (!isSupabaseConfigured()) return "visitor"
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return accessRoleOf(user)
}

export async function getSystemBoard(kind: SystemBoardKind): Promise<Board | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = createClient()
  const { data, error } = await supabase.from("boards").select("*").eq("kind", kind).maybeSingle()
  if (error) return null
  return (data as Board | null) ?? null
}

export async function canViewSystemBoard(kind: SystemBoardKind): Promise<boolean> {
  const board = await getSystemBoard(kind)
  if (!board) return true
  if (!board.is_active) return false
  const role = await currentAccessRole()
  return roleAtLeast(role, board.view_role)
}

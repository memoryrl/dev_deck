import { cache } from "react"
import { accessRoleOf, roleAtLeast, type AccessRole } from "@/lib/access"
import { SYSTEM_BOARD_KINDS } from "@/lib/boards/kind"
import { withBoardDefaults } from "@/lib/boards/permissions"
import { MEMORY_TTL, memoryKey, withMemoryCache } from "@/lib/cache/memory"
import { createClient, getAuthUser } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Board, SystemBoardKind } from "@/types/board"

const BOARD_SELECT = "id, slug, name, description, kind, view_role, write_role, is_active, sort_order, created_at, updated_at"

export const currentViewer = cache(async () => {
  if (!isSupabaseConfigured()) {
    return { user: null, role: "visitor" as const, isOwner: false, userId: null as string | null }
  }
  const user = await getAuthUser()
  const role = accessRoleOf(user)
  return { user, role, isOwner: role === "owner", userId: user?.id ?? null }
})

export async function currentAccessRole(): Promise<AccessRole> {
  return (await currentViewer()).role
}

const listSystemBoards = cache(async (): Promise<Partial<Record<SystemBoardKind, Board>>> => {
  if (!isSupabaseConfigured()) return {}
  return withMemoryCache(memoryKey.boardAll, MEMORY_TTL.board, async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("boards")
      .select(BOARD_SELECT)
      .in("kind", SYSTEM_BOARD_KINDS)
    if (error) return {}
    const map: Partial<Record<SystemBoardKind, Board>> = {}
    for (const row of (data as Board[]) ?? []) {
      if (SYSTEM_BOARD_KINDS.includes(row.kind as SystemBoardKind)) {
        map[row.kind as SystemBoardKind] = withBoardDefaults(row)
      }
    }
    return map
  })
})

export const getSystemBoard = cache(async (kind: SystemBoardKind): Promise<Board | null> => {
  const boards = await listSystemBoards()
  return boards[kind] ?? null
})

export async function canViewSystemBoard(kind: SystemBoardKind): Promise<boolean> {
  const board = await getSystemBoard(kind)
  if (!board) return true
  if (!board.is_active) return false
  const role = await currentAccessRole()
  return roleAtLeast(role, board.view_role)
}

export async function canWriteSystemBoard(kind: SystemBoardKind): Promise<boolean> {
  const board = await getSystemBoard(kind)
  if (!board || !board.is_active) return false
  const role = await currentAccessRole()
  return roleAtLeast(role, board.write_role)
}

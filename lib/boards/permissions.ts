import { ACCESS_ROLES, roleAtLeast, type AccessRole } from "@/lib/access"
import type { Board, BoardKind } from "@/types/board"

const MEMBER_COMMENT_SLUGS = new Set(["notice", "free"])

export function commentRoleFor(
  board: Pick<Board, "slug"> & { comment_role?: AccessRole | null }
): AccessRole {
  const role = board.comment_role
  if (role && ACCESS_ROLES.includes(role)) return role
  if (MEMBER_COMMENT_SLUGS.has(board.slug)) return "member"
  return "visitor"
}

export function canCommentOnBoard(
  role: AccessRole,
  board: Pick<Board, "slug"> & { comment_role?: AccessRole | null }
) {
  return roleAtLeast(role, commentRoleFor(board))
}

export function withBoardDefaults<T extends Pick<Board, "slug"> & { kind?: BoardKind | null; comment_role?: AccessRole | null }>(
  board: T
): T & { kind: BoardKind; comment_role: AccessRole } {
  return {
    ...board,
    kind: (board.kind ?? "generic") as BoardKind,
    comment_role: commentRoleFor(board),
  }
}

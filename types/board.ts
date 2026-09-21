import type { AccessRole } from "@/lib/access"

export type SystemBoardKind = "prompts" | "career" | "steam"
export type BoardKind = "generic" | SystemBoardKind

export type Board = {
  id: string
  slug: string
  name: string
  description: string | null
  kind: BoardKind
  view_role: AccessRole
  write_role: "member" | "owner"
  comment_role: AccessRole
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type BoardPost = {
  id: string
  board_id: string
  user_id: string
  title: string
  excerpt: string | null
  content: string
  is_published: boolean
  is_popup?: boolean
  created_at: string
  updated_at: string
}

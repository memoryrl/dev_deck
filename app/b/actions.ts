"use server"

import { revalidatePath } from "next/cache"
import { accessRoleOf, boardPath, roleAtLeast } from "@/lib/access"
import { getBoardById } from "@/lib/boards/public"
import { isSystemBoard } from "@/lib/boards/system"
import { isBlankContent } from "@/lib/content"
import { createClient, ensureProfile } from "@/lib/supabase/server"

async function canWriteBoard(boardId: string) {
  const user = await ensureProfile()
  if (!user) return { ok: false as const, error: "로그인이 필요합니다.", user: null }
  const board = await getBoardById(boardId)
  if (!board || !board.is_active) return { ok: false as const, error: "게시판을 찾을 수 없습니다.", user }
  if (isSystemBoard(board)) {
    return { ok: false as const, error: "시스템 게시판 글은 전용 대시보드에서 작성합니다.", user }
  }
  if (!roleAtLeast(accessRoleOf(user), board.write_role)) {
    return { ok: false as const, error: "이 게시판에 글을 쓸 권한이 없습니다.", user }
  }
  return { ok: true as const, user, board }
}

export async function savePublicPost(formData: FormData) {
  const boardId = String(formData.get("board_id") ?? "")
  const allowed = await canWriteBoard(boardId)
  if (!allowed.ok || !allowed.user) return { ok: false as const, error: allowed.error }

  const title = String(formData.get("title") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  if (!title || isBlankContent(content)) return { ok: false as const, error: "제목과 본문은 필수입니다." }

  const id = String(formData.get("id") ?? "")
  const supabase = createClient()
  const fields = {
    board_id: boardId,
    title,
    excerpt: String(formData.get("excerpt") ?? "").trim() || null,
    content,
    is_published: formData.get("is_published") === "on",
  }

  let error
  if (id) {
    let query = supabase.from("board_posts").update(fields).eq("id", id)
    if (accessRoleOf(allowed.user) !== "owner") {
      query = query.eq("user_id", allowed.user.id)
    }
    ;({ error } = await query)
  } else {
    ;({ error } = await supabase.from("board_posts").insert({ ...fields, user_id: allowed.user.id }))
  }
  if (error) return { ok: false as const, error: error.message }

  revalidatePath(boardPath(allowed.board.slug))
  revalidatePath("/")
  return { ok: true as const, slug: allowed.board.slug }
}

export async function removePublicPost(id: string, boardId: string) {
  const allowed = await canWriteBoard(boardId)
  if (!allowed.ok || !allowed.user) return { ok: false as const, error: allowed.error }
  const supabase = createClient()
  let query = supabase.from("board_posts").delete().eq("id", id)
  if (accessRoleOf(allowed.user) !== "owner") {
    query = query.eq("user_id", allowed.user.id)
  }
  const { error } = await query
  if (error) return { ok: false as const, error: error.message }
  revalidatePath(boardPath(allowed.board.slug))
  return { ok: true as const }
}

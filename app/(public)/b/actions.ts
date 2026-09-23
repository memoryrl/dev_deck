"use server"

import { revalidatePath } from "next/cache"
import { accessRoleOf, boardPath, roleAtLeast } from "@/lib/access"
import { buildTemplatePrompt, composeTemplateHtml } from "@/lib/boards/ai-template-generate"
import { getStoredBoardTemplate, storeBoardTemplate } from "@/lib/boards/ai-template-store"
import { findBoardTemplate } from "@/lib/boards/ai-templates"
import { getBoardById } from "@/lib/boards/public"
import { isSystemBoard } from "@/lib/boards/system"
import { isBlankContent, sanitizeRichHtml } from "@/lib/content"
import { NOTICE_BOARD_SLUG, setExclusiveNoticePopup } from "@/lib/boards/community"
import { chatWithOllama } from "@/lib/ollama/client"
import { createClient, ensureProfile } from "@/lib/supabase/server"
import { checkRateLimitPersistent } from "@/lib/uploads/rate-limit"

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

const GENERATE_MODEL = "exaone3.5:2.4b"

export type GenerateBoardTemplateResult = { ok: true; html: string } | { ok: false; error: string }

/** 게시판 글쓰기의 "AI 템플릿" 버튼. 목록은 lib/boards/ai-templates.ts 에 고정돼 있고,
 *  여기선 고른 템플릿의 섹션 본문만 로컬 LLM으로 채운다. 한 번 만든 양식은
 *  ai_board_templates 에 두고 다음부터는 AI를 부르지 않는다. */
export async function generateBoardTemplate(boardId: string, templateId: string): Promise<GenerateBoardTemplateResult> {
  const allowed = await canWriteBoard(boardId)
  if (!allowed.ok || !allowed.user || !allowed.board) return { ok: false, error: allowed.error }

  const template = findBoardTemplate(allowed.board.slug, templateId)
  if (!template) return { ok: false, error: "템플릿을 찾을 수 없습니다." }

  const stored = await getStoredBoardTemplate(allowed.board.id, template.id)
  if (stored) return { ok: true, html: stored }

  if (!(await checkRateLimitPersistent(`ai-board-template:${allowed.user.id}`, 10, 10 * 60 * 1000))) {
    return { ok: false, error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." }
  }

  const prompt = buildTemplatePrompt(allowed.board, template)
  const result = await chatWithOllama(GENERATE_MODEL, [{ role: "user", content: prompt }], { temperature: 0.5 })
  if (!result.ok) {
    return { ok: false, error: "지금은 AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." }
  }

  const html = sanitizeRichHtml(composeTemplateHtml(template, result.data.content))
  await storeBoardTemplate(allowed.board.id, template.id, html, GENERATE_MODEL)
  return { ok: true, html }
}

export async function savePublicPost(formData: FormData) {
  const boardId = String(formData.get("board_id") ?? "")
  const allowed = await canWriteBoard(boardId)
  if (!allowed.ok || !allowed.user) return { ok: false as const, error: allowed.error }

  const title = String(formData.get("title") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  if (!title || isBlankContent(content)) return { ok: false as const, error: "제목과 본문은 필수입니다." }

  const id = String(formData.get("id") ?? "")
  const supabase = await createClient()
  const fields = {
    board_id: boardId,
    title,
    excerpt: String(formData.get("excerpt") ?? "").trim() || null,
    content,
    is_published: formData.get("is_published") === "on",
  }

  let error
  let savedId = id
  if (id) {
    let query = supabase.from("board_posts").update(fields).eq("id", id)
    if (accessRoleOf(allowed.user) !== "owner") {
      query = query.eq("user_id", allowed.user.id)
    }
    ;({ error } = await query)
  } else {
    const inserted = await supabase.from("board_posts").insert({ ...fields, user_id: allowed.user.id }).select("id").maybeSingle()
    error = inserted.error
    savedId = inserted.data?.id ?? ""
  }
  if (error) return { ok: false as const, error: error.message }

  if (
    savedId &&
    allowed.board.slug === NOTICE_BOARD_SLUG &&
    accessRoleOf(allowed.user) === "owner" &&
    formData.get("is_popup") === "on"
  ) {
    const popup = await setExclusiveNoticePopup(savedId, true)
    if (!popup.ok) return { ok: false as const, error: popup.error }
  }

  revalidatePath(boardPath(allowed.board.slug))
  revalidatePath("/")
  return { ok: true as const, slug: allowed.board.slug }
}

export async function removePublicPost(id: string, boardId: string) {
  const allowed = await canWriteBoard(boardId)
  if (!allowed.ok || !allowed.user) return { ok: false as const, error: allowed.error }
  const supabase = await createClient()
  let query = supabase.from("board_posts").delete().eq("id", id)
  if (accessRoleOf(allowed.user) !== "owner") {
    query = query.eq("user_id", allowed.user.id)
  }
  const { error } = await query
  if (error) return { ok: false as const, error: error.message }
  revalidatePath(boardPath(allowed.board.slug))
  revalidatePath("/")
  return { ok: true as const }
}

export async function setNoticePopup(postId: string, enabled: boolean) {
  const user = await ensureProfile()
  if (!user || accessRoleOf(user) !== "owner") {
    return { ok: false as const, error: "관리자만 공지 팝업을 지정할 수 있습니다." }
  }
  const result = await setExclusiveNoticePopup(postId, enabled)
  if (!result.ok) return result
  revalidatePath("/")
  revalidatePath(boardPath(NOTICE_BOARD_SLUG))
  revalidatePath(`${boardPath(NOTICE_BOARD_SLUG)}/${postId}`)
  return { ok: true as const }
}


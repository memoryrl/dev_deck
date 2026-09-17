"use server"

import { revalidatePath } from "next/cache"
import { accessRoleOf, roleAtLeast } from "@/lib/access"
import { commentRoleFor } from "@/lib/boards/permissions"
import { getBoardById } from "@/lib/boards/public"
import { clientIpFromHeaders, resolveIpRegion } from "@/lib/comments/ip"
import { createClient, ensureProfile } from "@/lib/supabase/server"
import { isBlankContent, plainTextFromContent, sanitizeRichHtml } from "@/lib/content"
import { checkRateLimit } from "@/lib/uploads/rate-limit"
import { isSupabaseConfigured } from "@/lib/utils"
import type { CommentTargetType } from "@/types/comment"

const TARGETS: CommentTargetType[] = ["prompt", "career", "board", "steam"]
const BODY_TEXT_MAX = 2000
const BODY_HTML_MAX = 20000

function revalidateTarget(type: CommentTargetType, id: string) {
  revalidatePath(`/p/${id}`)
  revalidatePath(`/work/${id}`)
  revalidatePath(`/games/${id}`)
  revalidatePath(`/steam/${id}`)
  revalidatePath("/site/comments")
  if (type === "board") revalidatePath("/b", "layout")
}

export async function createComment(formData: FormData) {
  if (!isSupabaseConfigured()) return { ok: false as const, error: "저장소를 사용할 수 없습니다." }

  // 비회원도 쓸 수 있는 공개 폼이라 세션 기반 제한이 불가능하다 — IP당 짧은
  // 창구로 스팸 플러딩만 막는다.
  const ip = clientIpFromHeaders()
  if (!checkRateLimit(`comment:${ip}`, 5, 5 * 60 * 1000)) {
    return { ok: false as const, error: "댓글을 너무 자주 작성했습니다. 잠시 후 다시 시도해주세요." }
  }

  const targetType = String(formData.get("target_type") ?? "") as CommentTargetType
  const targetId = String(formData.get("target_id") ?? "").trim()
  const parentId = String(formData.get("parent_id") ?? "").trim() || null
  const body = sanitizeRichHtml(String(formData.get("body") ?? "")).trim()
  let authorName = String(formData.get("author_name") ?? "").trim()

  if (!TARGETS.includes(targetType) || !targetId) {
    return { ok: false as const, error: "댓글 대상이 올바르지 않습니다." }
  }
  if (isBlankContent(body)) return { ok: false as const, error: "내용을 입력하세요." }
  if (plainTextFromContent(body).length > BODY_TEXT_MAX) {
    return { ok: false as const, error: `댓글은 ${BODY_TEXT_MAX}자까지입니다.` }
  }
  if (body.length > BODY_HTML_MAX) return { ok: false as const, error: "댓글이 너무 깁니다." }

  const supabase = createClient()
  const user = await ensureProfile()

  if (targetType === "board") {
    const { data: post } = await supabase
      .from("board_posts")
      .select("board_id")
      .eq("id", targetId)
      .maybeSingle()
    if (!post) return { ok: false as const, error: "댓글 대상이 없습니다." }
    const board = await getBoardById(post.board_id)
    if (!board || !board.is_active) return { ok: false as const, error: "게시판을 찾을 수 없습니다." }
    const required = commentRoleFor(board)
    if (!roleAtLeast(accessRoleOf(user), required)) {
      if (!user) return { ok: false as const, error: "댓글을 쓰려면 로그인하세요." }
      return { ok: false as const, error: "이 게시판에 댓글을 쓸 권한이 없습니다." }
    }
  }

  if (user) {
    const meta = user.user_metadata ?? {}
    authorName =
      (typeof meta.full_name === "string" && meta.full_name.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      user.email?.split("@")[0] ||
      authorName
  }
  if (!authorName) return { ok: false as const, error: "이름을 입력하세요." }

  if (parentId) {
    const { data: parent } = await supabase.from("comments").select("id, target_type, target_id").eq("id", parentId).maybeSingle()
    if (!parent || parent.target_type !== targetType || parent.target_id !== targetId) {
      return { ok: false as const, error: "답글 대상이 없습니다." }
    }
  }

  const region = await resolveIpRegion(ip)
  const { error } = await supabase.from("comments").insert({
    target_type: targetType,
    target_id: targetId,
    parent_id: parentId,
    user_id: user?.id ?? null,
    author_name: authorName.slice(0, 40),
    body,
    ip_address: ip,
    ip_region: region,
    is_hidden: false,
  })
  if (error) return { ok: false as const, error: error.message }

  const returnTo = String(formData.get("return_to") ?? "").trim()
  revalidateTarget(targetType, targetId)
  if (returnTo.startsWith("/")) revalidatePath(returnTo)
  return { ok: true as const }
}

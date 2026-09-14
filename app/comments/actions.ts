"use server"

import { revalidatePath } from "next/cache"
import { clientIpFromHeaders, resolveIpRegion } from "@/lib/comments/ip"
import { createClient, ensureProfile } from "@/lib/supabase/server"
import { isBlankContent, plainTextFromContent, sanitizeRichHtml } from "@/lib/content"
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

  const ip = clientIpFromHeaders()
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

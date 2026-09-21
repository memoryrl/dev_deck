"use server"

import { revalidatePath } from "next/cache"
import { forgetMemoryCache } from "@/lib/cache/memory"
import { requireOwner } from "@/lib/auth/owner"
import { ACCESS_ROLES, type AccessRole } from "@/lib/access"
import { isSystemBoard, isSystemBoardKind, RESERVED_BOARD_SLUGS } from "@/lib/boards/kind"
import { NOTICE_BOARD_SLUG, setExclusiveNoticePopup } from "@/lib/boards/community"
import { isBlankContent } from "@/lib/content"
import { createClient } from "@/lib/supabase/server"
import type { Board } from "@/types/board"
import type { MenuLocation } from "@/types/menu"
import { isMenuLocation } from "@/lib/menus/locations"
import { buildMenuLabels } from "@/lib/menus/label"

function refreshSite() {
  forgetMemoryCache("menus:")
  forgetMemoryCache("board:")
  forgetMemoryCache("public:")
  revalidatePath("/")
  revalidatePath("/site/boards")
  revalidatePath("/site/menus")
  revalidatePath("/site/dashboard", "layout")
  revalidatePath("/promptkit", "layout")
  revalidatePath("/career", "layout")
  revalidatePath("/steam", "layout")
  revalidatePath("/b", "layout")
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function parseRole(value: string, fallback: AccessRole): AccessRole {
  return ACCESS_ROLES.includes(value as AccessRole) ? (value as AccessRole) : fallback
}

export async function upsertBoard(formData: FormData) {
  await requireOwner()
  const supabase = await createClient()
  const id = String(formData.get("id") ?? "")
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase()
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return { ok: false as const, error: "게시판 이름은 필수입니다." }
  if (!SLUG_RE.test(slug)) return { ok: false as const, error: "슬러그는 영문 소문자, 숫자, 하이픈만 가능합니다." }

  let existing: Board | null = null
  if (id) {
    const { data } = await supabase.from("boards").select("*").eq("id", id).maybeSingle()
    existing = (data as Board | null) ?? null
    if (!existing) return { ok: false as const, error: "게시판을 찾을 수 없습니다." }
  }

  const reserved = Object.values(RESERVED_BOARD_SLUGS)
  if (!existing && reserved.includes(slug)) {
    return { ok: false as const, error: "이 슬러그는 시스템 게시판용입니다." }
  }

  const writeRole = String(formData.get("write_role") ?? "owner")
  if (writeRole !== "member" && writeRole !== "owner") {
    return { ok: false as const, error: "쓰기 권한이 올바르지 않습니다." }
  }

  const commentRole = parseRole(String(formData.get("comment_role") ?? "visitor"), "visitor")

  const payload = {
    slug: existing && isSystemBoard(existing) ? existing.slug : slug,
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    view_role: parseRole(String(formData.get("view_role") ?? "visitor"), "visitor"),
    write_role: existing && isSystemBoard(existing) ? "owner" : writeRole,
    comment_role: commentRole,
    is_active: formData.get("is_active") === "on",
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
    ...(existing ? {} : { kind: "generic" as const }),
  }

  const persist = async (body: typeof payload | Omit<typeof payload, "comment_role">) => {
    const query = id
      ? supabase.from("boards").update(body).eq("id", id)
      : supabase.from("boards").insert(body)
    return query
  }

  let { error } = await persist(payload)
  if (error && /comment_role/.test(error.message)) {
    const { comment_role: _omit, ...withoutCommentRole } = payload
    const retry = await persist(withoutCommentRole)
    error = retry.error
  }
  if (error) return { ok: false as const, error: error.message }
  refreshSite()
  return { ok: true as const }
}

export async function deleteBoard(id: string) {
  await requireOwner()
  const supabase = await createClient()
  const { data } = await supabase.from("boards").select("kind").eq("id", id).maybeSingle()
  if (data && isSystemBoardKind(data.kind)) {
    return { ok: false as const, error: "시스템 게시판은 삭제할 수 없습니다." }
  }
  const { error } = await supabase.from("boards").delete().eq("id", id)
  if (error) return { ok: false as const, error: error.message }
  refreshSite()
  return { ok: true as const }
}

export async function upsertMenu(formData: FormData) {
  await requireOwner()
  const supabase = await createClient()
  const id = String(formData.get("id") ?? "")
  const label = String(formData.get("label_ko") ?? formData.get("label") ?? "").trim()
  if (!label) return { ok: false as const, error: "메뉴 이름은 필수입니다." }
  const labelEn = String(formData.get("label_en") ?? "").trim()

  const location = String(formData.get("location") ?? "header")
  if (!isMenuLocation(location)) {
    return { ok: false as const, error: "메뉴 위치가 올바르지 않습니다." }
  }

  const parentId = String(formData.get("parent_id") ?? "") || null
  const boardId = String(formData.get("board_id") ?? "") || null
  const href = String(formData.get("href") ?? "").trim() || null
  const icon = String(formData.get("icon") ?? "").trim() || null
  let resolvedLocation: MenuLocation = location

  if (parentId) {
    const { data: parent } = await supabase
      .from("menus")
      .select("location")
      .eq("id", parentId)
      .maybeSingle()
    if (parent?.location && isMenuLocation(parent.location)) {
      resolvedLocation = parent.location
    }
  }

  const payload = {
    label,
    labels: buildMenuLabels(label, labelEn),
    href: boardId ? null : href,
    parent_id: parentId,
    board_id: boardId,
    location: resolvedLocation,
    icon,
    view_role: parseRole(String(formData.get("view_role") ?? "visitor"), "visitor"),
    is_active: formData.get("is_active") === "on",
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
  }

  const persist = async (body: Record<string, unknown>) => {
    const query = id
      ? supabase.from("menus").update(body).eq("id", id).select("id").single()
      : supabase.from("menus").insert(body).select("id").single()
    return query
  }

  let { data, error } = await persist(payload)
  if (error && /labels/.test(error.message)) {
    return {
      ok: false as const,
      error: "menus.labels 컬럼이 없습니다. supabase/patch-menu-labels.sql 을 SQL Editor에서 실행하세요.",
    }
  }
  if (error && /icon/.test(error.message)) {
    const { icon: _omit, ...withoutIcon } = payload
    const retry = await persist(withoutIcon)
    data = retry.data
    error = retry.error
  }
  if (error) return { ok: false as const, error: error.message }
  refreshSite()
  return { ok: true as const, id: data?.id ?? id }
}

export async function deleteMenu(id: string) {
  await requireOwner()
  const supabase = await createClient()
  const { error } = await supabase.from("menus").delete().eq("id", id)
  if (error) return { ok: false as const, error: error.message }
  refreshSite()
  return { ok: true as const }
}

export async function upsertBoardPost(formData: FormData) {
  const user = await requireOwner()
  const supabase = await createClient()
  const id = String(formData.get("id") ?? "")
  const boardId = String(formData.get("board_id") ?? "")
  const title = String(formData.get("title") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  if (!boardId) return { ok: false as const, error: "게시판이 필요합니다." }
  if (!title || isBlankContent(content)) return { ok: false as const, error: "제목과 본문은 필수입니다." }

  const { data: board } = await supabase.from("boards").select("kind, slug").eq("id", boardId).maybeSingle()
  if (board && isSystemBoardKind(board.kind)) {
    return { ok: false as const, error: "시스템 게시판 글은 전용 대시보드에서 작성합니다." }
  }

  const fields = {
    title,
    excerpt: String(formData.get("excerpt") ?? "").trim() || null,
    content,
    is_published: formData.get("is_published") === "on",
  }

  let savedId = id
  if (id) {
    const { error } = await supabase.from("board_posts").update(fields).eq("id", id)
    if (error) return { ok: false as const, error: error.message }
  } else {
    const inserted = await supabase
      .from("board_posts")
      .insert({ ...fields, board_id: boardId, user_id: user.id })
      .select("id")
      .maybeSingle()
    if (inserted.error) return { ok: false as const, error: inserted.error.message }
    savedId = inserted.data?.id ?? ""
  }

  if (savedId && board?.slug === NOTICE_BOARD_SLUG && formData.get("is_popup") === "on") {
    const popup = await setExclusiveNoticePopup(savedId, true)
    if (!popup.ok) return { ok: false as const, error: popup.error }
  }

  refreshSite()
  revalidatePath(`/site/boards/${boardId}`)
  return { ok: true as const }
}

export async function deleteBoardPost(id: string, boardId: string) {
  await requireOwner()
  const supabase = await createClient()
  const { error } = await supabase.from("board_posts").delete().eq("id", id)
  if (error) return { ok: false as const, error: error.message }
  refreshSite()
  revalidatePath(`/site/boards/${boardId}`)
  return { ok: true as const }
}

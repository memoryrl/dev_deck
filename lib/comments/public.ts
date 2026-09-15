import { nestComments } from "@/lib/comments/tree"
import {
  clampPage,
  emptyPage,
  LIST_PAGE_SIZE,
  pageCountOf,
  pageRange,
  type PagedResult,
} from "@/lib/pagination"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Comment, CommentNode, CommentTargetType, ProfanityWord } from "@/types/comment"

export async function listComments(targetType: CommentTargetType, targetId: string): Promise<CommentNode[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: true })
  if (error) return []
  return nestComments((data as Comment[]) ?? [])
}

export async function listAllComments(page = 1, pageSize = LIST_PAGE_SIZE): Promise<PagedResult<Comment>> {
  return fetchCommentPage("comments", "created_at", false, page, pageSize)
}

export async function listProfanityWords(page = 1, pageSize = LIST_PAGE_SIZE): Promise<PagedResult<ProfanityWord>> {
  return fetchCommentPage("profanity_words", "word", true, page, pageSize)
}

async function fetchCommentPage<T>(
  table: "comments" | "profanity_words",
  orderColumn: string,
  ascending: boolean,
  requestedPage: number,
  pageSize: number
): Promise<PagedResult<T>> {
  if (!isSupabaseConfigured()) return emptyPage(requestedPage, pageSize)

  const supabase = createClient()
  const first = clampPage(requestedPage, Number.MAX_SAFE_INTEGER, pageSize)
  const result = await queryPage<T>(supabase, table, orderColumn, ascending, first, pageSize)
  if (!result) return emptyPage(1, pageSize)

  const page = clampPage(first, result.total, pageSize)
  if (page !== first) {
    const again = await queryPage<T>(supabase, table, orderColumn, ascending, page, pageSize)
    if (!again) return { ...emptyPage(page, pageSize), total: result.total, page, pageCount: pageCountOf(result.total, pageSize) }
    return again
  }
  return result
}

async function queryPage<T>(
  supabase: ReturnType<typeof createClient>,
  table: "comments" | "profanity_words",
  orderColumn: string,
  ascending: boolean,
  page: number,
  pageSize: number
): Promise<PagedResult<T> | null> {
  const { from, to } = pageRange(page, pageSize)
  const { data, error, count } = await supabase
    .from(table)
    .select("*", { count: "exact" })
    .order(orderColumn, { ascending })
    .range(from, to)
  if (error) return null
  const total = count ?? 0
  return {
    rows: (data as T[]) ?? [],
    total,
    page,
    pageSize,
    pageCount: pageCountOf(total, pageSize),
  }
}

export function commentTargetHref(type: CommentTargetType, id: string, boardSlug?: string | null) {
  if (type === "prompt") return `/p/${id}`
  if (type === "career") return `/work/${id}`
  if (type === "steam") return `/games/${id}`
  if (boardSlug) return `/b/${boardSlug}/${id}`
  return `/b`
}

export function commentTargetLabel(type: CommentTargetType) {
  if (type === "prompt") return "프롬프트"
  if (type === "career") return "커리어"
  if (type === "steam") return "게임"
  return "게시글"
}

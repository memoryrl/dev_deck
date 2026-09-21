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
import { createServiceClient } from "@/lib/supabase/service"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Comment, CommentNode, CommentTargetType, ProfanityWord } from "@/types/comment"

// 공개 API(anon/authenticated)가 읽을 수 있는 댓글 컬럼. 전체 IP(ip_address)와 작성 회원 ID(user_id)는
// DB에서 컬럼 권한으로 막혀 있으므로 select("*")를 쓰면 오류가 난다 — 항상 이 목록을 쓴다.
export const PUBLIC_COMMENT_COLUMNS =
  "id, target_type, target_id, parent_id, author_name, body, ip_masked, ip_region, is_hidden, created_at, updated_at"

export async function listComments(targetType: CommentTargetType, targetId: string): Promise<CommentNode[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("comments")
    .select(PUBLIC_COMMENT_COLUMNS)
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

  // 관리자 화면 전용. 댓글은 전체 IP·회원 ID까지 봐야 해서 서비스 롤로 읽는다(호출하는 페이지가 관리자 확인을 먼저 한다).
  const supabase = table === "comments" ? createServiceClient() : await createClient()
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
  supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createServiceClient>,
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

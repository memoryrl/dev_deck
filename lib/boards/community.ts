import { boardPath } from "@/lib/access"
import type { NoticePopupView } from "@/lib/boards/notice-popup-window"
import { NOTICE_BOARD_SLUG, COMMUNITY_LATEST_LIMIT } from "@/lib/boards/slugs"
import { plainTextFromContent } from "@/lib/content"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export { NOTICE_BOARD_SLUG, COMMUNITY_LATEST_LIMIT } from "@/lib/boards/slugs"

export type NoticePopupPost = NoticePopupView

export type CommunityLatestPost = {
  id: string
  title: string
  href: string
  createdAt: string
  boardSlug: string
  boardName: string
}

function excerptOf(excerpt: string | null | undefined, content: string, max = 160) {
  const text = (excerpt?.trim() || plainTextFromContent(content)).trim()
  if (!text) return ""
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trim()}…`
}

export async function listLatestCommunityPosts(limit = COMMUNITY_LATEST_LIMIT): Promise<CommunityLatestPost[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createClient()
  const { data: boards, error: boardError } = await supabase
    .from("boards")
    .select("id, slug, name")
    .eq("kind", "generic")
    .eq("is_active", true)
    .eq("view_role", "visitor")
  if (boardError || !boards?.length) return []

  const byId = new Map(boards.map((board) => [board.id, board]))
  const { data: posts, error } = await supabase
    .from("board_posts")
    .select("id, board_id, title, created_at")
    .in(
      "board_id",
      boards.map((board) => board.id)
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) return []

  return (posts ?? []).flatMap((post) => {
    const board = byId.get(post.board_id)
    if (!board) return []
    return [
      {
        id: post.id,
        title: post.title,
        href: `${boardPath(board.slug)}/${post.id}`,
        createdAt: post.created_at,
        boardSlug: board.slug,
        boardName: board.name,
      },
    ]
  })
}

export async function getNoticePopupPost(): Promise<NoticePopupPost | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = createClient()
  const { data: board } = await supabase
    .from("boards")
    .select("id, slug")
    .eq("slug", NOTICE_BOARD_SLUG)
    .eq("is_active", true)
    .maybeSingle()
  if (!board) return null

  const { data, error } = await supabase
    .from("board_posts")
    .select("id, title, excerpt, content")
    .eq("board_id", board.id)
    .eq("is_published", true)
    .eq("is_popup", true)
    .maybeSingle()
  if (error || !data) return null

  return {
    id: data.id,
    title: data.title,
    excerpt: excerptOf(data.excerpt, data.content),
    content: data.content ?? "",
    href: `${boardPath(board.slug)}/${data.id}`,
  }
}

export async function setExclusiveNoticePopup(
  postId: string,
  enabled: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient()
  const { data: post, error: postError } = await supabase
    .from("board_posts")
    .select("id, board_id")
    .eq("id", postId)
    .maybeSingle()
  if (postError || !post) return { ok: false, error: postError?.message ?? "글을 찾을 수 없습니다." }

  const { data: board } = await supabase.from("boards").select("slug").eq("id", post.board_id).maybeSingle()
  if (board?.slug !== NOTICE_BOARD_SLUG) {
    return { ok: false, error: "공지사항 글만 팝업으로 지정할 수 있습니다." }
  }

  const { error: clearError } = await supabase.from("board_posts").update({ is_popup: false }).eq("is_popup", true)
  if (clearError) return { ok: false, error: clearError.message }
  if (!enabled) return { ok: true }

  const { error } = await supabase
    .from("board_posts")
    .update({ is_popup: true, is_published: true })
    .eq("id", postId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

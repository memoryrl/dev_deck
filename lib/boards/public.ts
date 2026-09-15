import { emptyPage, fetchPagedRows, ilikeContains, LIST_PAGE_SIZE, type PagedResult } from "@/lib/pagination"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Board, BoardPost } from "@/types/board"

export async function listBoards(): Promise<Board[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createClient()
  const { data, error } = await supabase.from("boards").select("*").order("sort_order").order("name")
  if (error) return []
  return ((data as Board[]) ?? []).map((board) => ({
    ...board,
    kind: board.kind ?? "generic",
  }))
}

export async function getBoardBySlug(slug: string): Promise<Board | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = createClient()
  const { data, error } = await supabase.from("boards").select("*").eq("slug", slug).maybeSingle()
  if (error) return null
  return data ? { ...(data as Board), kind: (data as Board).kind ?? "generic" } : null
}

export async function getBoardById(id: string): Promise<Board | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = createClient()
  const { data, error } = await supabase.from("boards").select("*").eq("id", id).maybeSingle()
  if (error) return null
  return data ? { ...(data as Board), kind: (data as Board).kind ?? "generic" } : null
}

export async function listBoardPosts(boardId: string): Promise<BoardPost[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from("board_posts")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false })
  if (error) return []
  return (data as BoardPost[]) ?? []
}

export async function listBoardPostsPage(
  boardId: string,
  page: number,
  q = ""
): Promise<PagedResult<BoardPost>> {
  if (!isSupabaseConfigured()) return emptyPage(page)
  const supabase = createClient()
  const needle = q.trim()
  return fetchPagedRows(page, LIST_PAGE_SIZE, async (from, to) => {
    let query = supabase
      .from("board_posts")
      .select("*", { count: "exact" })
      .eq("board_id", boardId)
      .order("created_at", { ascending: false })
    if (needle) query = query.ilike("title", ilikeContains(needle))
    const { data, error, count } = await query.range(from, to)
    if (error) return null
    return { rows: (data as BoardPost[]) ?? [], total: count ?? 0 }
  })
}

export async function getBoardPost(id: string): Promise<BoardPost | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = createClient()
  const { data, error } = await supabase.from("board_posts").select("*").eq("id", id).maybeSingle()
  if (error) return null
  return (data as BoardPost | null) ?? null
}

import { emptyPage, fetchPagedRows, ilikeContains, LIST_PAGE_SIZE, type PagedResult } from "@/lib/pagination"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { SystemBoardKind } from "@/types/board"
import { SYSTEM_BOARD_SEEDS, systemEntryHref } from "@/lib/boards/kind"

export {
  SYSTEM_BOARD_KINDS,
  RESERVED_BOARD_SLUGS,
  SYSTEM_BOARD_SEEDS,
  isSystemBoardKind,
  isSystemBoard,
  kindLabel,
  systemDashboardHref,
  systemEntryHref,
  systemPublicHref,
} from "@/lib/boards/kind"

export async function ensureSystemBoards() {
  if (!isSupabaseConfigured()) return
  const supabase = await createClient()
  const { data, error } = await supabase.from("boards").select("kind, slug")
  if (error) return

  const haveKind = new Set((data ?? []).map((row) => row.kind))
  const haveSlug = new Set((data ?? []).map((row) => row.slug))

  for (const seed of SYSTEM_BOARD_SEEDS) {
    if (haveKind.has(seed.kind)) continue
    if (haveSlug.has(seed.slug)) {
      await supabase.from("boards").update({ kind: seed.kind }).eq("slug", seed.slug).eq("kind", "generic")
      continue
    }
    await supabase.from("boards").insert({
      slug: seed.slug,
      name: seed.name,
      description: seed.description,
      kind: seed.kind,
      view_role: "visitor",
      write_role: "owner",
      is_active: true,
      sort_order: seed.sort_order,
    })
  }
}

export type ModuleEntry = {
  id: string
  title: string
  href: string
  published: boolean
  note?: string
  createdAt: string
}

export async function listModuleEntries(kind: SystemBoardKind): Promise<ModuleEntry[]> {
  const page = await listModuleEntriesPage(kind, 1, "", 500)
  return page.rows
}

export async function listModuleEntriesPage(
  kind: SystemBoardKind,
  page: number,
  q = "",
  pageSize = LIST_PAGE_SIZE
): Promise<PagedResult<ModuleEntry>> {
  if (!isSupabaseConfigured()) return emptyPage(page, pageSize)
  const supabase = await createClient()
  const needle = q.trim()

  if (kind === "prompts") {
    return fetchPagedRows(page, pageSize, async (from, to) => {
      let query = supabase
        .from("prompts")
        .select("id, title, is_public, category, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
      if (needle) query = query.ilike("title", ilikeContains(needle))
      const { data, error, count } = await query.range(from, to)
      if (error) return null
      return {
        rows: (data ?? []).map((row) => ({
          id: row.id,
          title: row.title,
          href: systemEntryHref(kind, row.id),
          published: Boolean(row.is_public),
          note: row.category,
          createdAt: row.created_at,
        })),
        total: count ?? 0,
      }
    })
  }

  if (kind === "career") {
    return fetchPagedRows(page, pageSize, async (from, to) => {
      let query = supabase
        .from("career_posts")
        .select("id, title, is_public, post_type, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
      if (needle) query = query.ilike("title", ilikeContains(needle))
      const { data, error, count } = await query.range(from, to)
      if (error) return null
      return {
        rows: (data ?? []).map((row) => ({
          id: row.id,
          title: row.title,
          href: systemEntryHref(kind, row.id),
          published: Boolean(row.is_public),
          note: row.post_type,
          createdAt: row.created_at,
        })),
        total: count ?? 0,
      }
    })
  }

  return fetchPagedRows(page, pageSize, async (from, to) => {
    let query = supabase
      .from("game_reviews")
      .select("id, app_id, game_title, review_text, rating, created_at", { count: "exact" })
      .order("updated_at", { ascending: false })
    if (needle) query = query.ilike("game_title", ilikeContains(needle))
    const { data, error, count } = await query.range(from, to)
    if (error) return null
    return {
      rows: (data ?? []).map((row) => ({
        id: row.id,
        title: row.game_title,
        href: systemEntryHref(kind, row.id, row.app_id),
        published: Boolean(row.review_text?.trim()),
        note: `평점 ${row.rating}`,
        createdAt: row.created_at,
      })),
      total: count ?? 0,
    }
  })
}

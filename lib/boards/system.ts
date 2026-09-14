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
  const supabase = createClient()
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
  if (!isSupabaseConfigured()) return []
  const supabase = createClient()

  if (kind === "prompts") {
    const { data } = await supabase
      .from("prompts")
      .select("id, title, is_public, category, created_at")
      .order("created_at", {
        ascending: false,
      })
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      href: systemEntryHref(kind, row.id),
      published: Boolean(row.is_public),
      note: row.category,
      createdAt: row.created_at,
    }))
  }

  if (kind === "career") {
    const { data } = await supabase
      .from("career_posts")
      .select("id, title, is_public, post_type, created_at")
      .order("created_at", { ascending: false })
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      href: systemEntryHref(kind, row.id),
      published: Boolean(row.is_public),
      note: row.post_type,
      createdAt: row.created_at,
    }))
  }

  const { data } = await supabase
    .from("game_reviews")
    .select("id, app_id, game_title, review_text, rating, created_at")
    .order("updated_at", { ascending: false })
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.game_title,
    href: systemEntryHref(kind, row.id, row.app_id),
    published: Boolean(row.review_text?.trim()),
    note: `평점 ${row.rating}`,
    createdAt: row.created_at,
  }))
}

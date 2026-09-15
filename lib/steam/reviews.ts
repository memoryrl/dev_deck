import { cache } from "react"
import { canViewSystemBoard, currentAccessRole } from "@/lib/boards/access"
import { MEMORY_TTL, memoryKey, withMemoryCache } from "@/lib/cache/memory"
import {
  emptyPage,
  fetchPagedRows,
  ilikeContains,
  LIST_PAGE_SIZE,
  type PagedResult,
} from "@/lib/pagination"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { GameReview } from "@/types/steam"

const REVIEW_CARD_SELECT =
  "id, app_id, game_title, rating, umpc_preset, is_favorite, created_at, updated_at"
const REVIEW_TEASER_SELECT = `${REVIEW_CARD_SELECT}, review_text`

function asReviewCard(row: Omit<GameReview, "user_id" | "review_text"> & { review_text?: string | null }): GameReview {
  return { ...row, user_id: "", review_text: row.review_text ?? null }
}

export const listPublicGameReviews = cache(async (): Promise<GameReview[]> => {
  if (!isSupabaseConfigured()) return []
  if (!(await canViewSystemBoard("steam"))) return []
  const role = await currentAccessRole()
  return withMemoryCache(memoryKey.reviews(role), MEMORY_TTL.publicList, async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("game_reviews")
      .select(REVIEW_CARD_SELECT)
      .order("updated_at", { ascending: false })
    return ((data as Omit<GameReview, "user_id" | "review_text">[]) ?? []).map(asReviewCard)
  })
})

export async function listGameReviewsPage({
  page,
  q = "",
}: {
  page: number
  q?: string
}): Promise<PagedResult<GameReview>> {
  if (!isSupabaseConfigured()) return emptyPage(page)
  if (!(await canViewSystemBoard("steam"))) return emptyPage(page)
  const supabase = createClient()
  const needle = q.trim()
  return fetchPagedRows(page, LIST_PAGE_SIZE, async (from, to) => {
    let query = supabase
      .from("game_reviews")
      .select(REVIEW_CARD_SELECT, { count: "exact" })
      .order("updated_at", { ascending: false })
    if (needle) query = query.ilike("game_title", ilikeContains(needle))
    const { data, error, count } = await query.range(from, to)
    if (error) return null
    return {
      rows: ((data as Omit<GameReview, "user_id" | "review_text">[]) ?? []).map(asReviewCard),
      total: count ?? 0,
    }
  })
}

export const listLatestPublicGameReviews = cache(async (limit = 6): Promise<GameReview[]> => {
  if (!isSupabaseConfigured()) return []
  if (!(await canViewSystemBoard("steam"))) return []
  const role = await currentAccessRole()
  return withMemoryCache(`${memoryKey.reviews(role)}:latest:${limit}`, MEMORY_TTL.publicList, async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("game_reviews")
      .select(REVIEW_TEASER_SELECT)
      .order("updated_at", { ascending: false })
      .limit(limit)
    return ((data as Omit<GameReview, "user_id">[]) ?? []).map(asReviewCard)
  })
})

export const countPublicGameReviews = cache(async (): Promise<number> => {
  if (!isSupabaseConfigured()) return 0
  if (!(await canViewSystemBoard("steam"))) return 0
  const role = await currentAccessRole()
  return withMemoryCache(`${memoryKey.reviews(role)}:count`, MEMORY_TTL.publicList, async () => {
    const supabase = createClient()
    const { count } = await supabase.from("game_reviews").select("id", { count: "exact", head: true })
    return count ?? 0
  })
})

export const getLatestUmpcReview = cache(async (): Promise<GameReview | null> => {
  if (!isSupabaseConfigured()) return null
  if (!(await canViewSystemBoard("steam"))) return null
  const role = await currentAccessRole()
  return withMemoryCache(`${memoryKey.reviews(role)}:umpc`, MEMORY_TTL.publicList, async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("game_reviews")
      .select(REVIEW_CARD_SELECT)
      .not("umpc_preset", "is", null)
      .neq("umpc_preset", "")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    return data ? asReviewCard(data as Omit<GameReview, "user_id" | "review_text">) : null
  })
})

export async function getPublicGameReview(appId: number): Promise<GameReview | null> {
  if (!isSupabaseConfigured()) return null
  if (!(await canViewSystemBoard("steam"))) return null
  const supabase = createClient()
  const { data } = await supabase
    .from("game_reviews")
    .select("*")
    .eq("app_id", appId)
    .maybeSingle()
  return (data as GameReview | null) ?? null
}

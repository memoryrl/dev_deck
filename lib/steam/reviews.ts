import { canViewSystemBoard } from "@/lib/boards/access"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { GameReview } from "@/types/steam"

export async function listPublicGameReviews(): Promise<GameReview[]> {
  if (!isSupabaseConfigured()) return []
  if (!(await canViewSystemBoard("steam"))) return []
  const supabase = createClient()
  const { data } = await supabase.from("game_reviews").select("*")
  return (data as GameReview[]) ?? []
}

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

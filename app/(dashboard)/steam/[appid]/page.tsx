import { GameCatalog } from "@/components/steam/game-catalog"
import { fetchGamePageData } from "@/lib/steam/client"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { GameReview } from "@/types/steam"
import { ReviewForm } from "./review-form"

export default async function SteamDetailPage({
  params,
}: {
  params: { appid: string }
}) {
  const appId = Number(params.appid)
  let review: GameReview | null = null
  if (isSupabaseConfigured() && appId) {
    const supabase = createClient()
    const { data } = await supabase
      .from("game_reviews")
      .select("*")
      .eq("app_id", appId)
      .maybeSingle()
    review = (data as GameReview | null) ?? null
  }

  const { game, catalog, achievements } = Number.isFinite(appId)
    ? await fetchGamePageData(appId)
    : { game: null, catalog: null, achievements: null }
  const title = game?.name ?? catalog?.name ?? review?.game_title ?? `App ${appId}`

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <GameCatalog
        appId={appId}
        title={title}
        game={game}
        catalog={catalog}
        achievements={achievements}
      />
      <ReviewForm appId={appId} gameTitle={title} review={review} />
    </div>
  )
}

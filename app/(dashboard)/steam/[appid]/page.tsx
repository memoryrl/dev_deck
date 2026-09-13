import { SteamCover } from "@/components/steam/steam-cover"
import { fetchOwnedGames } from "@/lib/steam/client"
import { steamHeaderUrl } from "@/lib/steam/images"
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

  let title = review?.game_title ?? `App ${appId}`
  try {
    const steam = await fetchOwnedGames()
    const game = steam.games.find((item) => item.app_id === appId)
    if (game?.name) title = game.name
  } catch {
    /* 라이브러리를 못 불러도 리뷰 폼은 연다 */
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SteamCover
        src={steamHeaderUrl(appId)}
        alt=""
        className="aspect-[460/215] w-full rounded-xl"
      />
      <h1 className="font-display text-3xl font-extrabold">{title}</h1>
      <ReviewForm appId={appId} gameTitle={title} review={review} />
    </div>
  )
}

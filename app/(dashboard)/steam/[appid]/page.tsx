import { PostPager } from "@/components/board/post-pager"
import { ArticleComments } from "@/components/comments/article-comments"
import { GameCatalog } from "@/components/steam/game-catalog"
import { fetchGamePageData } from "@/lib/steam/client"
import { ownedGameNeighbors } from "@/lib/steam/neighbors"
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
    const { data } = await supabase.from("game_reviews").select("*").eq("app_id", appId).maybeSingle()
    review = (data as GameReview | null) ?? null
  }

  const { game, catalog, achievements } = Number.isFinite(appId)
    ? await fetchGamePageData(appId)
    : { game: null, catalog: null, achievements: null }
  const title = game?.name ?? catalog?.name ?? review?.game_title ?? `App ${appId}`
  const neighbors = await ownedGameNeighbors(String(appId), "/steam")

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PostPager listHref="/steam" {...neighbors} />
      <GameCatalog
        appId={appId}
        title={title}
        game={game}
        catalog={catalog}
        achievements={achievements}
      />
      <ReviewForm appId={appId} gameTitle={title} review={review} />
      <PostPager placement="bottom" listHref="/steam" {...neighbors} />
      <ArticleComments targetType="steam" targetId={String(appId)} returnTo={`/steam/${appId}`} />
    </div>
  )
}

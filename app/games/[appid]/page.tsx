import { ArticleReader } from "@/components/board/article-reader"
import { PostPager } from "@/components/board/post-pager"
import { PublicContainer } from "@/components/layout/public-container"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/ui/star-rating"
import { RichContent } from "@/components/editor/rich-content"
import { GameCatalog } from "@/components/steam/game-catalog"
import { fetchGamePageData } from "@/lib/steam/client"
import { ownedGameNeighbors } from "@/lib/steam/neighbors"
import { getPublicGameReview } from "@/lib/steam/reviews"

export default async function PublicGamePage({
  params,
}: {
  params: { appid: string }
}) {
  const appId = Number(params.appid)
  const review = Number.isFinite(appId) ? await getPublicGameReview(appId) : null
  const { game, catalog, achievements } = Number.isFinite(appId)
    ? await fetchGamePageData(appId)
    : { game: null, catalog: null, achievements: null }
  const title = game?.name ?? catalog?.name ?? review?.game_title ?? `App ${appId}`
  const neighbors = await ownedGameNeighbors(String(appId), "/games")

  return (
    <PublicContainer as="article" className="space-y-8">
      <ArticleReader>
        <PostPager listHref="/games" {...neighbors} />
        <GameCatalog
          appId={appId}
          title={title}
          game={game}
          catalog={catalog}
          achievements={achievements}
        />
        {review ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold">리뷰</h2>
              {review.is_favorite ? <Badge variant="secondary">즐겨찾기</Badge> : null}
            </div>
            <StarRating defaultValue={review.rating} readOnly />
            {review.review_text ? (
              <RichContent content={review.review_text} />
            ) : (
              <p className="text-sm text-muted-foreground">아직 리뷰 본문이 없습니다.</p>
            )}
            {review.umpc_preset ? (
              <p className="rounded-md bg-muted px-4 py-3 text-sm">{review.umpc_preset}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">아직 공개 리뷰가 없습니다.</p>
        )}
        <PostPager listHref="/games" {...neighbors} />
      </ArticleReader>
    </PublicContainer>
  )
}

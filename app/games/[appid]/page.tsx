import { ReviewForm } from "@/app/(dashboard)/steam/[appid]/review-form"
import { ArticleEditPanel } from "@/components/board/article-edit-panel"
import { ArticleReader } from "@/components/board/article-reader"
import { PostPager } from "@/components/board/post-pager"
import { ArticleComments } from "@/components/comments/article-comments"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"
import { PublicContainer } from "@/components/layout/public-container"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/ui/star-rating"
import { RichContent } from "@/components/editor/rich-content"
import { GameCatalog } from "@/components/steam/game-catalog"
import { currentViewer } from "@/lib/boards/access"
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
  const { isOwner } = await currentViewer()

  const reviewView = review ? (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-2xl font-bold">리뷰</h2>
        {review.is_favorite ? <Badge variant="secondary">즐겨찾기</Badge> : null}
      </div>
      <StarRating defaultValue={review.rating} readOnly />
      {review.review_text ? (
        <RichContent content={review.review_text} />
      ) : (
        <EmptyPlaceholder className="mt-2">아직 리뷰 본문이 없습니다.</EmptyPlaceholder>
      )}
      {review.umpc_preset ? (
        <p className="rounded-md bg-muted px-4 py-3 text-sm">{review.umpc_preset}</p>
      ) : null}
    </div>
  ) : (
    <EmptyPlaceholder>아직 공개 리뷰가 없습니다.</EmptyPlaceholder>
  )

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
        <div className="mt-8">
          {isOwner ? (
            <ArticleEditPanel
              label={review ? "리뷰 수정" : "리뷰 작성"}
              form={<ReviewForm appId={appId} gameTitle={title} review={review} />}
            >
              {reviewView}
            </ArticleEditPanel>
          ) : (
            reviewView
          )}
        </div>
        <PostPager placement="bottom" listHref="/games" {...neighbors} />
        <ArticleComments targetType="steam" targetId={String(appId)} returnTo={`/games/${appId}`} />
      </ArticleReader>
    </PublicContainer>
  )
}

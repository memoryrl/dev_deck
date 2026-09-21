import { Suspense } from "react"
import { ReviewForm } from "@/app/(dashboard)/steam/[appid]/review-form"
import { ArticleEditPanel } from "@/components/board/article-edit-panel"
import { ArticleReader } from "@/components/board/article-reader"
import { PostPager } from "@/components/board/post-pager"
import { ArticleComments } from "@/components/comments/article-comments"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"
import { ArticleSkeleton, CommentSectionSkeleton, PagerSkeleton } from "@/components/layout/skeletons"
import { PublicContainer } from "@/components/layout/public-container"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/ui/star-rating"
import { RichContent } from "@/components/editor/rich-content"
import { GameCatalog } from "@/components/steam/game-catalog"
import { currentViewer } from "@/lib/boards/access"
import { fetchGamePageData } from "@/lib/steam/client"
import { ownedGameNeighbors } from "@/lib/steam/neighbors"
import { getPublicGameReview } from "@/lib/steam/reviews"

// 화면 뼈대(컨테이너·문서 흐름)는 즉시 스트리밍하고, 각 구간은 각자 데이터가 준비되는
// 대로 따로 채워 넣는다. 예전엔 한 함수가 리뷰·게임데이터(외부 Steam API)·이웃글·로그인
// 여부를 다 기다린 "다음에" 페이지 전체를 렌더링해서, Steam API가 느린 순간 화면
// 전체가 그만큼 늦게 나타났다. 지금은 섹션별 Suspense라 느린 구간만 그 자리에서
// 로딩 표시가 남고, 나머지는 먼저 보인다.
export default function PublicGamePage({
  params,
}: {
  params: { appid: string }
}) {
  const appId = Number(params.appid)

  return (
    <PublicContainer as="article" className="space-y-8">
      <ArticleReader>
        <Suspense fallback={<PagerSkeleton />}>
          <NeighborsPager appId={appId} />
        </Suspense>
        <Suspense fallback={<ArticleSkeleton />}>
          <GameCatalogSection appId={appId} />
        </Suspense>
        <div className="mt-8">
          <Suspense fallback={<ReviewSectionSkeleton />}>
            <ReviewSection appId={appId} />
          </Suspense>
        </div>
        <Suspense fallback={<PagerSkeleton className="mt-10" />}>
          <NeighborsPager appId={appId} placement="bottom" />
        </Suspense>
        <Suspense fallback={<CommentSectionSkeleton />}>
          <ArticleComments targetType="steam" targetId={String(appId)} returnTo={`/games/${appId}`} />
        </Suspense>
      </ArticleReader>
    </PublicContainer>
  )
}

async function NeighborsPager({ appId, placement }: { appId: number; placement?: "bottom" }) {
  const neighbors = await ownedGameNeighbors(String(appId), "/games")
  return <PostPager placement={placement} listHref="/games" {...neighbors} />
}

async function GameCatalogSection({ appId }: { appId: number }) {
  const { game, catalog, achievements } = Number.isFinite(appId)
    ? await fetchGamePageData(appId)
    : { game: null, catalog: null, achievements: null }
  const title = game?.name ?? catalog?.name ?? `App ${appId}`
  return <GameCatalog appId={appId} title={title} game={game} catalog={catalog} achievements={achievements} />
}

function ReviewSectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-7 w-24 animate-pulse rounded bg-muted" />
      <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

async function ReviewSection({ appId }: { appId: number }) {
  const [review, viewer] = await Promise.all([
    Number.isFinite(appId) ? getPublicGameReview(appId) : Promise.resolve(null),
    currentViewer(),
  ])
  const { isOwner } = viewer
  // GameCatalogSection과 독립적으로 스트리밍되므로 실제 카탈로그 이름은 아직 모를 수
  // 있다 — 리뷰에 저장된 제목이나 앱ID로 대신한다(편집 폼 라벨용, 페이지 본문 제목이
  // 아니다).
  const title = review?.game_title ?? `App ${appId}`

  const reviewView = review ? (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-2xl font-bold">리뷰</h2>
        {review.is_favorite ? <Badge variant="secondary">즐겨찾기</Badge> : null}
      </div>
      <StarRating defaultValue={review.rating} readOnly />
      {review.review_text ? (
        <div className="text-lg leading-relaxed">
          <RichContent content={review.review_text} />
        </div>
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

  if (!isOwner) return reviewView

  return (
    <ArticleEditPanel
      label={review ? "리뷰 수정" : "리뷰 작성"}
      form={<ReviewForm appId={appId} gameTitle={title} review={review} />}
    >
      {reviewView}
    </ArticleEditPanel>
  )
}

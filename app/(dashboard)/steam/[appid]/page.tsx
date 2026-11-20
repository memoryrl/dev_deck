import { Suspense } from "react"
import { PostPager } from "@/components/board/post-pager"
import { ArticleComments } from "@/components/comments/article-comments"
import { ArticleSkeleton, CommentSectionSkeleton, EditorFormSkeleton, PagerSkeleton } from "@/components/layout/skeletons"
import { GameCatalog } from "@/components/steam/game-catalog"
import { fetchGamePageData } from "@/lib/steam/client"
import { ownedGameNeighbors } from "@/lib/steam/neighbors"
import { isPlaceholderGameTitle, placeholderGameTitle, resolveGameTitle } from "@/lib/steam/titles"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { GameReview } from "@/types/steam"
import { ReviewForm } from "./review-form"
import { ShareButton } from "@/components/share/share-button"
import type { Metadata } from "next"

// games/[appid]/page.tsx와 같은 이유로 섹션별 Suspense — 외부 Steam API 호출
// (fetchGamePageData)이 느려도 이웃글·리뷰 폼은 먼저 보인다.
export const metadata: Metadata = { title: "게임 상세 관리 · DevDeck", robots: { index: false, follow: false } }

export default async function SteamDetailPage(
  props: {
    params: Promise<{ appid: string }>
  }
) {
  const params = await props.params;
  const appId = Number(params.appid)

  return (
    <div className="w-full space-y-8">
      <Suspense fallback={<PagerSkeleton />}>
        <NeighborsPager appId={appId} />
      </Suspense>
      <Suspense fallback={<ArticleSkeleton />}>
        <GameCatalogSection appId={appId} />
      </Suspense>
      <Suspense fallback={<EditorFormSkeleton />}>
        <ReviewFormSection appId={appId} />
      </Suspense>
      <Suspense fallback={<PagerSkeleton className="mt-10" />}>
        <NeighborsPager appId={appId} placement="bottom" />
      </Suspense>
      <Suspense fallback={<CommentSectionSkeleton />}>
        <ArticleComments targetType="steam" targetId={String(appId)} returnTo={`/steam/${appId}`} />
      </Suspense>
    </div>
  )
}

async function NeighborsPager({ appId, placement }: { appId: number; placement?: "bottom" }) {
  const neighbors = await ownedGameNeighbors(String(appId), "/steam")
  return <PostPager placement={placement} listHref="/steam" {...neighbors} />
}

async function GameCatalogSection({ appId }: { appId: number }) {
  const { game, catalog, achievements } = Number.isFinite(appId)
    ? await fetchGamePageData(appId)
    : { game: null, catalog: null, achievements: null }
  const title = game?.name ?? catalog?.name ?? placeholderGameTitle(appId)
  return <GameCatalog appId={appId} title={title} game={game} catalog={catalog} achievements={achievements} />
}

async function ReviewFormSection({ appId }: { appId: number }) {
  const [{ data }, page] = await Promise.all([
    isSupabaseConfigured() && appId
      ? (await createClient()).from("game_reviews").select("*").eq("app_id", appId).maybeSingle()
      : Promise.resolve({ data: null }),
    Number.isFinite(appId) ? fetchGamePageData(appId) : Promise.resolve({ game: null, catalog: null, achievements: null }),
  ])
  const review = (data as GameReview | null) ?? null
  // 저장된 제목이 "App 123" 자리표시면 소유 목록·스토어 이름으로 바꿔 폼에 넘긴다. 그대로 저장되면 홈 최신 리뷰에 App ID만 남는다.
  const title = isPlaceholderGameTitle(review?.game_title, appId)
    ? await resolveGameTitle(appId, page.game?.name ?? page.catalog?.name)
    : review?.game_title ?? page.game?.name ?? page.catalog?.name ?? placeholderGameTitle(appId)
  return (
    <div className="space-y-4">
      {review ? (
        <div className="flex justify-end">
          <ShareButton targetType="game" targetId={String(appId)} />
        </div>
      ) : null}
      <ReviewForm appId={appId} gameTitle={title} review={review} />
    </div>
  )
}

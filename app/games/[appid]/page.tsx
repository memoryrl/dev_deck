import Link from "next/link"
import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/ui/star-rating"
import { RichContent } from "@/components/editor/rich-content"
import { SteamCover } from "@/components/steam/steam-cover"
import { steamHeaderUrl } from "@/lib/steam/images"
import { getPublicGameReview } from "@/lib/steam/reviews"

export default async function PublicGamePage({
  params,
}: {
  params: { appid: string }
}) {
  const appId = Number(params.appid)
  const review = Number.isFinite(appId) ? await getPublicGameReview(appId) : null
  const title = review?.game_title ?? `App ${appId}`

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <article className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-5 py-12">
        <SteamCover
          src={steamHeaderUrl(appId)}
          alt=""
          className="aspect-[460/215] w-full rounded-xl"
        />
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-4xl font-extrabold">{title}</h1>
          {review?.is_favorite ? <Badge variant="secondary">즐겨찾기</Badge> : null}
        </div>
        {review ? (
          <div className="space-y-4">
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
        <p className="text-sm">
          <Link href="/games" className="font-semibold underline">
            목록으로
          </Link>
        </p>
      </article>
      <PublicFooter />
    </div>
  )
}

import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { SteamLibrary } from "@/app/(dashboard)/steam/steam-library"
import { listPublicGameReviews } from "@/lib/steam/reviews"

export default async function PublicGamesPage() {
  const reviews = await listPublicGameReviews()

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12">
        <h1 className="font-display text-4xl font-extrabold">Steam 라이브러리</h1>
        <p className="mt-2 text-muted-foreground">
          보유 게임과 한줄 리뷰. 보기는 로그인 없이 가능합니다.
        </p>
        <div className="mt-8">
          <SteamLibrary reviews={reviews} hrefBase="/games" />
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

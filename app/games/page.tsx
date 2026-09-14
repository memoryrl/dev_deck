import { Suspense } from "react"
import { SteamLibrary } from "@/app/(dashboard)/steam/steam-library"
import { PublicContainer } from "@/components/layout/public-container"
import { SteamLibrarySkeleton } from "@/components/layout/skeletons"
import { fetchOwnedGames } from "@/lib/steam/client"
import { listPublicGameReviews } from "@/lib/steam/reviews"

export default function PublicGamesPage() {
  return (
    <PublicContainer>
      <h1 className="font-display text-4xl font-extrabold">Steam 라이브러리</h1>
      <p className="mt-2 text-muted-foreground">
        보유 게임, 플레이 기록, 한줄 리뷰. 보기는 로그인 없이 가능합니다.
      </p>
      <div className="mt-8">
        <Suspense fallback={<SteamLibrarySkeleton />}>
          <GamesLibrary />
        </Suspense>
      </div>
    </PublicContainer>
  )
}

async function GamesLibrary() {
  const [reviews, steam] = await Promise.all([
    listPublicGameReviews(),
    fetchOwnedGames()
      .then((library) => ({ library, error: null as string | null }))
      .catch(() => ({ library: null, error: "Steam 응답이 실패했습니다." })),
  ])
  return (
    <SteamLibrary
      reviews={reviews}
      library={steam.library}
      error={steam.error}
      hrefBase="/games"
    />
  )
}

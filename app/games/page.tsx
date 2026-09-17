import { Suspense } from "react"
import { SteamLibrary } from "@/app/(dashboard)/steam/steam-library"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { PublicContainer } from "@/components/layout/public-container"
import { SteamLibrarySkeleton } from "@/components/layout/skeletons"
import { parseListPage } from "@/lib/pagination"
import { fetchOwnedGames } from "@/lib/steam/client"
import { listPublicGameReviews } from "@/lib/steam/reviews"
import { parseSteamLibrarySort } from "@/lib/steam/sort"
import { getT } from "@/lib/i18n/dictionary"

export default function PublicGamesPage({
  searchParams,
}: {
  searchParams?: { page?: string; sort?: string }
}) {
  const { t } = getT()
  return (
    <PublicContainer>
      <PageTitleBanner title={t("games.title")} />
      <p className="mt-6 text-muted-foreground">
        {t("games.lede")}
      </p>
      <div className="mt-8">
        <Suspense fallback={<SteamLibrarySkeleton />}>
          <GamesLibrary page={parseListPage(searchParams?.page)} sort={parseSteamLibrarySort(searchParams?.sort)} />
        </Suspense>
      </div>
    </PublicContainer>
  )
}

async function GamesLibrary({
  page,
  sort,
}: {
  page: number
  sort: ReturnType<typeof parseSteamLibrarySort>
}) {
  const [reviews, steam] = await Promise.all([
    listPublicGameReviews(),
    fetchOwnedGames()
      .then((library) => ({ library, error: null as string | null }))
      .catch(() => ({ library: null, error: getT().t("steam.fetchFailed") })),
  ])
  return (
    <SteamLibrary
      reviews={reviews}
      library={steam.library}
      error={steam.error}
      hrefBase="/games"
      page={page}
      sort={sort}
    />
  )
}

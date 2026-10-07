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
import { pageMeta } from "@/lib/seo"
import type { Metadata } from "next"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT()
  return pageMeta({ title: t("games.title"), description: t("games.lede"), path: "/games" })
}

export default async function PublicGamesPage(
  props: {
    searchParams?: Promise<{ page?: string; sort?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const { t } = await getT()
  return (
    <PublicContainer>
      <PageTitleBanner title={t("games.title")} description={t("games.lede")} />
      <div className="mt-8">
        {/* key: 정렬·페이지가 바뀌면 Suspense를 새로 열어 스켈레톤을 다시 보여준다 */}
        <Suspense key={`${searchParams?.page ?? 1}-${searchParams?.sort ?? ""}`} fallback={<SteamLibrarySkeleton />}>
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
      .catch(async () => ({ library: null, error: (await getT()).t("steam.fetchFailed") })),
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

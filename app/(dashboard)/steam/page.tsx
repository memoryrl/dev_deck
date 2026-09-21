import { Suspense } from "react"
import { fetchOwnedGames } from "@/lib/steam/client"
import { listPublicGameReviews } from "@/lib/steam/reviews"
import { parseListPage } from "@/lib/pagination"
import { parseSteamLibrarySort } from "@/lib/steam/sort"
import { ensureProfile } from "@/lib/supabase/server"
import { getT } from "@/lib/i18n/dictionary"
import { isSupabaseConfigured } from "@/lib/utils"
import type { GameReview, SteamGamesResponse } from "@/types/steam"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { SteamLibrarySkeleton } from "@/components/layout/skeletons"
import { SteamLibrary } from "./steam-library"

export default async function SteamPage(
  props: {
    searchParams?: Promise<{ page?: string; sort?: string }>
  }
) {
  const searchParams = await props.searchParams;
  return (
    <div className="w-full">
      <PageTitleBanner title="Steam Tracker" className="mb-6" />
      <Suspense fallback={<SteamLibrarySkeleton />}>
        <SteamLibraryBody
          page={parseListPage(searchParams?.page)}
          sort={parseSteamLibrarySort(searchParams?.sort)}
        />
      </Suspense>
    </div>
  )
}

async function SteamLibraryBody({
  page,
  sort,
}: {
  page: number
  sort: ReturnType<typeof parseSteamLibrarySort>
}) {
  const [, reviews, steamResult] = await Promise.all([
    isSupabaseConfigured() ? ensureProfile() : Promise.resolve(null),
    isSupabaseConfigured() ? listPublicGameReviews() : Promise.resolve([] as GameReview[]),
    fetchOwnedGames()
      .then((data) => ({ library: data, error: null as string | null }))
      .catch(async () => ({ library: null as SteamGamesResponse | null, error: (await getT()).t("steam.fetchFailed") })),
  ])
  const { library, error } = steamResult

  return (
    <SteamLibrary reviews={reviews} library={library} error={error} page={page} sort={sort} />
  )
}

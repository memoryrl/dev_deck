import { fetchOwnedGames } from "@/lib/steam/client"
import { listPublicGameReviews } from "@/lib/steam/reviews"
import { parseListPage } from "@/lib/pagination"
import { parseSteamLibrarySort } from "@/lib/steam/sort"
import { ensureProfile } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { GameReview, SteamGamesResponse } from "@/types/steam"
import { SteamLibrary } from "./steam-library"

export default async function SteamPage({
  searchParams,
}: {
  searchParams?: { page?: string; sort?: string }
}) {
  let reviews: GameReview[] = []
  let library: SteamGamesResponse | null = null
  let error: string | null = null

  if (isSupabaseConfigured()) {
    await ensureProfile()
    reviews = await listPublicGameReviews()
  }

  try {
    library = await fetchOwnedGames()
  } catch {
    error = "Steam 응답이 실패했습니다."
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 font-display text-3xl font-extrabold">Steam Tracker</h1>
      <SteamLibrary
        reviews={reviews}
        library={library}
        error={error}
        page={parseListPage(searchParams?.page)}
        sort={parseSteamLibrarySort(searchParams?.sort)}
      />
    </div>
  )
}

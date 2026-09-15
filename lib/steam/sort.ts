import type { GameReview, SteamGame } from "@/types/steam"

export type SteamLibrarySort = "playtime" | "recent" | "two_weeks"

export function parseSteamLibrarySort(value: string | string[] | undefined): SteamLibrarySort {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === "recent" || raw === "two_weeks") return raw
  return "playtime"
}

export function compareSteamGames(
  a: SteamGame,
  b: SteamGame,
  sort: SteamLibrarySort,
  reviewMap: Map<number, GameReview>
) {
  if (sort === "playtime") {
    const favA = reviewMap.get(a.app_id)?.is_favorite ? 1 : 0
    const favB = reviewMap.get(b.app_id)?.is_favorite ? 1 : 0
    if (favA !== favB) return favB - favA
    return b.playtime_forever_minutes - a.playtime_forever_minutes
  }
  if (sort === "two_weeks") {
    return (b.playtime_2weeks_minutes ?? 0) - (a.playtime_2weeks_minutes ?? 0)
  }
  return Date.parse(b.last_played_at ?? "0") - Date.parse(a.last_played_at ?? "0")
}

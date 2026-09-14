import { findNeighbors } from "@/lib/posts/neighbors"
import { fetchOwnedGames } from "@/lib/steam/client"

export async function ownedGameNeighbors(appId: string, hrefBase: "/games" | "/steam") {
  try {
    const steam = await fetchOwnedGames()
    const games = [...steam.games].sort((a, b) => b.playtime_forever_minutes - a.playtime_forever_minutes)
    return findNeighbors(
      games,
      appId,
      (item) => String(item.app_id),
      (item) => `${hrefBase}/${item.app_id}`,
      (item) => item.name
    )
  } catch {
    return { prev: null, next: null }
  }
}

import { fetchOwnedGames } from "@/lib/steam/client"
import { listPublicGameReviews } from "@/lib/steam/reviews"
import { compareSteamGames } from "@/lib/steam/sort"
import { formatPlaytime } from "@/lib/utils"

export const TOP_GAMES_LIMIT = 10

export type PodiumEntry = {
  rank: number
  appId: number
  name: string
  playtimeLabel: string
  headerImageUrl: string
}

export async function getTopSteamGames(limit = TOP_GAMES_LIMIT): Promise<PodiumEntry[]> {
  const [library, reviews] = await Promise.all([
    fetchOwnedGames(),
    listPublicGameReviews().catch(() => []),
  ])
  const reviewMap = new Map(reviews.map((review) => [review.app_id, review]))
  return [...library.games]
    .sort((a, b) => compareSteamGames(a, b, "playtime", reviewMap))
    .slice(0, limit)
    .map((game, index) => ({
      rank: index + 1,
      appId: game.app_id,
      name: game.name,
      playtimeLabel: formatPlaytime(game.playtime_forever_minutes),
      headerImageUrl: game.header_image_url,
    }))
}

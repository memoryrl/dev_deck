import { steamHeaderUrl, steamIconUrl } from "@/lib/steam/images"
import type { SteamGamesResponse } from "@/types/steam"

type SteamOwnedGame = {
  appid: number
  name?: string
  playtime_forever?: number
  playtime_2weeks?: number
  img_icon_url?: string
}

export async function fetchOwnedGames(): Promise<SteamGamesResponse> {
  const key = process.env.STEAM_API_KEY
  const steamId = process.env.STEAM_ID
  if (!key || !steamId) {
    throw new Error("Steam is not configured")
  }

  const url = new URL(
    "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"
  )
  url.searchParams.set("key", key)
  url.searchParams.set("steamid", steamId)
  url.searchParams.set("include_appinfo", "1")
  url.searchParams.set("include_played_free_games", "1")

  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error("Steam request failed")
  }

  const json = (await res.json()) as {
    response?: { game_count?: number; games?: SteamOwnedGame[] }
  }
  const games = json.response?.games ?? []

  return {
    steam_id: steamId,
    game_count: json.response?.game_count ?? games.length,
    games: games.map((game) => ({
      app_id: game.appid,
      name: game.name ?? `App ${game.appid}`,
      playtime_forever_minutes: game.playtime_forever ?? 0,
      playtime_2weeks_minutes: game.playtime_2weeks ?? null,
      img_icon_url: steamIconUrl(game.appid, game.img_icon_url ?? null),
      header_image_url: steamHeaderUrl(game.appid),
    })),
  }
}

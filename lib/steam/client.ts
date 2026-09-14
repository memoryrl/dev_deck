import { steamHeaderUrl, steamIconUrl } from "@/lib/steam/images"
import { fetchAchievementSummary, fetchAppCatalog } from "@/lib/steam/store"
import { MEMORY_TTL, memoryKey, withMemoryCache } from "@/lib/cache/memory"
import { cache } from "react"
import type {
  SteamGame,
  SteamGamePageData,
  SteamGamesResponse,
  SteamProfile,
} from "@/types/steam"

type SteamOwnedGame = {
  appid: number
  name?: string
  playtime_forever?: number
  playtime_2weeks?: number
  playtime_windows_forever?: number
  playtime_mac_forever?: number
  playtime_linux_forever?: number
  playtime_deck_forever?: number
  rtime_last_played?: number
  img_icon_url?: string
  has_community_visible_stats?: boolean
}

type SteamPlayer = {
  personaname?: string
  avatarfull?: string
  profileurl?: string
}

function minutes(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
}

function lastPlayedAt(unix: number | undefined) {
  if (!unix || unix <= 0) return null
  return new Date(unix * 1000).toISOString()
}

function mapOwnedGame(game: SteamOwnedGame): SteamGame {
  return {
    app_id: game.appid,
    name: game.name ?? `App ${game.appid}`,
    playtime_forever_minutes: minutes(game.playtime_forever),
    playtime_2weeks_minutes: game.playtime_2weeks ? minutes(game.playtime_2weeks) : null,
    playtime_windows_minutes: minutes(game.playtime_windows_forever),
    playtime_mac_minutes: minutes(game.playtime_mac_forever),
    playtime_linux_minutes: minutes(game.playtime_linux_forever),
    playtime_deck_minutes: minutes(game.playtime_deck_forever),
    last_played_at: lastPlayedAt(game.rtime_last_played),
    has_community_visible_stats: game.has_community_visible_stats === true,
    img_icon_url: steamIconUrl(game.appid, game.img_icon_url ?? null),
    header_image_url: steamHeaderUrl(game.appid),
  }
}

async function fetchSteamProfile(key: string, steamId: string): Promise<SteamProfile | null> {
  const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/")
  url.searchParams.set("key", key)
  url.searchParams.set("steamids", steamId)

  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) return null

  const json = (await res.json()) as { response?: { players?: SteamPlayer[] } }
  const player = json.response?.players?.[0]
  if (!player?.personaname) return null

  return {
    persona_name: player.personaname,
    avatar_url: player.avatarfull ?? null,
    profile_url: player.profileurl ?? null,
  }
}

async function loadOwnedGames(): Promise<SteamGamesResponse> {
  const key = process.env.STEAM_API_KEY
  const steamId = process.env.STEAM_ID
  if (!key || !steamId) {
    throw new Error("Steam is not configured")
  }

  const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/")
  url.searchParams.set("key", key)
  url.searchParams.set("steamid", steamId)
  url.searchParams.set("include_appinfo", "1")
  url.searchParams.set("include_played_free_games", "1")
  url.searchParams.set("include_extended_appinfo", "1")

  const [gamesRes, profile] = await Promise.all([
    fetch(url, { next: { revalidate: 300 } }),
    fetchSteamProfile(key, steamId).catch(() => null),
  ])

  if (!gamesRes.ok) {
    throw new Error("Steam request failed")
  }

  const json = (await gamesRes.json()) as {
    response?: { game_count?: number; games?: SteamOwnedGame[] }
  }
  const games = json.response?.games ?? []

  return {
    steam_id: steamId,
    game_count: json.response?.game_count ?? games.length,
    profile,
    games: games.map(mapOwnedGame),
  }
}

export const fetchOwnedGames = cache(async () =>
  withMemoryCache(memoryKey.steamOwned, MEMORY_TTL.steamOwned, loadOwnedGames)
)

export async function fetchGamePageData(appId: number): Promise<SteamGamePageData> {
  const [owned, catalog] = await Promise.all([
    fetchOwnedGames().catch(() => null),
    fetchAppCatalog(appId).catch(() => null),
  ])
  const game = owned?.games.find((item) => item.app_id === appId) ?? null
  const achievements = game?.has_community_visible_stats
    ? await fetchAchievementSummary(appId).catch(() => null)
    : null

  return { game, catalog, achievements }
}

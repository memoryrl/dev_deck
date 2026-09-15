import { steamHeaderUrl } from "@/lib/steam/images"
import { MEMORY_TTL, memoryKey, withMemoryCache } from "@/lib/cache/memory"
import type {
  SteamAchievementSummary,
  SteamAppCatalog,
  SteamDeckCompat,
} from "@/types/steam"

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function asStringList(value: unknown, nestedKey?: string) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim()
      const record = asRecord(item)
      if (!record) return ""
      return nestedKey ? asString(record[nestedKey]) ?? "" : ""
    })
    .filter(Boolean)
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function parseDeckCompat(value: unknown): SteamDeckCompat | null {
  const record = asRecord(value)
  const category = asNumber(record?.category) ?? Number(record?.category)
  if (category === 4) return "verified"
  if (category === 3) return "playable"
  if (category === 2) return "unsupported"
  if (category === 1) return "unknown"
  return null
}

const STORE_HEADERS = {
  Accept: "application/json",
  "Accept-Language": "ko-KR,ko;q=0.9",
}

export async function fetchAppCatalog(appId: number): Promise<SteamAppCatalog | null> {
  if (!Number.isFinite(appId) || appId <= 0) return null

  const url = new URL("https://store.steampowered.com/api/appdetails")
  url.searchParams.set("appids", String(appId))
  url.searchParams.set("l", "koreana")
  url.searchParams.set("cc", "kr")

  const res = await fetch(url, {
    headers: STORE_HEADERS,
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null

  const json = (await res.json()) as Record<string, unknown>
  const entry = asRecord(json[String(appId)])
  if (!entry || entry.success !== true) return null
  const data = asRecord(entry.data)
  if (!data) return null

  const platforms = asRecord(data.platforms)
  const release = asRecord(data.release_date)
  const metacritic = asRecord(data.metacritic)
  const achievements = asRecord(data.achievements)
  const recommendations = asRecord(data.recommendations)
  const screenshots = Array.isArray(data.screenshots) ? data.screenshots : []

  return {
    app_id: appId,
    name: asString(data.name),
    short_description: asString(data.short_description)
      ? stripHtml(asString(data.short_description) as string)
      : null,
    developers: asStringList(data.developers),
    publishers: asStringList(data.publishers),
    genres: asStringList(data.genres, "description"),
    release_date: asString(release?.date),
    coming_soon: release?.coming_soon === true,
    metacritic: asNumber(metacritic?.score),
    platforms: {
      windows: platforms?.windows === true,
      mac: platforms?.mac === true,
      linux: platforms?.linux === true,
    },
    deck_compat: parseDeckCompat(data.steam_deck_compatibility),
    screenshots: screenshots
      .map((item) => {
        const rec = asRecord(item)
        const full = asString(rec?.path_full)
        const thumbnail = asString(rec?.path_thumbnail) ?? full
        if (!thumbnail) return null
        return { thumbnail, full: full ?? thumbnail }
      })
      .filter((item): item is { thumbnail: string; full: string } => Boolean(item))
      .slice(0, 4),
    header_image: asString(data.header_image),
    store_url: `https://store.steampowered.com/app/${appId}`,
    recommendations: asNumber(recommendations?.total),
    achievement_total: asNumber(achievements?.total),
  }
}

export async function resolveSteamHeaderUrl(appId: number): Promise<string> {
  return withMemoryCache(memoryKey.steamCover(appId), MEMORY_TTL.steamCover, () =>
    probeSteamHeaderUrl(appId)
  )
}

async function probeSteamHeaderUrl(appId: number): Promise<string> {
  const classic = steamHeaderUrl(appId)
  try {
    const probe = await fetch(classic, {
      method: "HEAD",
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(4000),
    })
    if (probe.ok) return classic
  } catch {
    // CDN에 header.jpg가 없거나 타임아웃이면 상점 메타의 해시 URL을 쓴다.
  }
  return (await fetchAppCatalog(appId).catch(() => null))?.header_image ?? classic
}

export async function fetchAchievementSummary(
  appId: number
): Promise<SteamAchievementSummary | null> {
  const key = process.env.STEAM_API_KEY
  const steamId = process.env.STEAM_ID
  if (!key || !steamId || !Number.isFinite(appId) || appId <= 0) return null

  const url = new URL("https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/")
  url.searchParams.set("key", key)
  url.searchParams.set("steamid", steamId)
  url.searchParams.set("appid", String(appId))
  url.searchParams.set("l", "koreana")

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return null

  const json = (await res.json()) as {
    playerstats?: { success?: boolean; achievements?: { achieved?: number }[] }
  }
  const list = json.playerstats?.achievements
  if (!json.playerstats?.success || !Array.isArray(list) || list.length === 0) return null

  return {
    unlocked: list.filter((item) => item.achieved === 1).length,
    total: list.length,
  }
}

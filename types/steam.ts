export type GameReview = {
  id: string
  user_id: string
  app_id: number
  game_title: string
  review_text: string | null
  rating: number
  umpc_preset: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export type SteamProfile = {
  persona_name: string
  avatar_url: string | null
  profile_url: string | null
}

export type SteamGame = {
  app_id: number
  name: string
  playtime_forever_minutes: number
  playtime_2weeks_minutes: number | null
  playtime_windows_minutes: number
  playtime_mac_minutes: number
  playtime_linux_minutes: number
  playtime_deck_minutes: number
  last_played_at: string | null
  has_community_visible_stats: boolean
  img_icon_url: string | null
  header_image_url: string
}

export type SteamGamesResponse = {
  steam_id: string
  game_count: number
  profile: SteamProfile | null
  games: SteamGame[]
}

export type SteamDeckCompat = "verified" | "playable" | "unsupported" | "unknown"

export type SteamAppCatalog = {
  app_id: number
  name: string | null
  short_description: string | null
  developers: string[]
  publishers: string[]
  genres: string[]
  release_date: string | null
  coming_soon: boolean
  metacritic: number | null
  platforms: {
    windows: boolean
    mac: boolean
    linux: boolean
  }
  deck_compat: SteamDeckCompat | null
  screenshots: { thumbnail: string; full: string }[]
  header_image: string | null
  store_url: string
  recommendations: number | null
  achievement_total: number | null
}

export type SteamAchievementSummary = {
  unlocked: number
  total: number
}

export type SteamGamePageData = {
  game: SteamGame | null
  catalog: SteamAppCatalog | null
  achievements: SteamAchievementSummary | null
}

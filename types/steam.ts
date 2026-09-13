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

export type SteamGame = {
  app_id: number
  name: string
  playtime_forever_minutes: number
  playtime_2weeks_minutes: number | null
  img_icon_url: string | null
  header_image_url: string
}

export type SteamGamesResponse = {
  steam_id: string
  game_count: number
  games: SteamGame[]
}

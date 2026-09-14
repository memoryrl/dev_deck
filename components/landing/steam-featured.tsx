export type FeaturedGame = {
  app_id: number
  name: string
  playtime_forever_minutes: number
  playtime_2weeks_minutes: number | null
  playtime_deck_minutes: number
  last_played_at: string | null
  header_image_url?: string | null
}

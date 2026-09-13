import { createClient, ensureProfile } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { GameReview } from "@/types/steam"
import { SteamLibrary } from "./steam-library"

export default async function SteamPage() {
  let reviews: GameReview[] = []
  if (isSupabaseConfigured()) {
    await ensureProfile()
    const supabase = createClient()
    const { data } = await supabase.from("game_reviews").select("*")
    reviews = (data as GameReview[]) ?? []
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 font-display text-3xl font-extrabold">Steam Tracker</h1>
      <SteamLibrary reviews={reviews} />
    </div>
  )
}

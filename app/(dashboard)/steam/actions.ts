"use server"

import { revalidatePath } from "next/cache"
import { forgetMemoryCache } from "@/lib/cache/memory"
import { requireOwner } from "@/lib/auth/owner"
import { isBlankContent } from "@/lib/content"
import { isPlaceholderGameTitle, resolveGameTitle } from "@/lib/steam/titles"
import { createClient } from "@/lib/supabase/server"

function refreshReview(appId: number) {
  forgetMemoryCache("public:reviews")
  revalidatePath("/")
  revalidatePath("/games")
  revalidatePath(`/games/${appId}`)
  revalidatePath("/steam")
  revalidatePath(`/steam/${appId}`)
}

export async function upsertGameReview(formData: FormData) {
  const user = await requireOwner()
  const supabase = await createClient()
  const appId = Number(formData.get("app_id"))
  let gameTitle = String(formData.get("game_title") ?? "").trim()
  if (!appId) return { ok: false as const, error: "게임 정보가 없습니다." }
  // 폼은 카탈로그 이름을 모를 때 `App 123` 자리표시를 보낸다 — 그대로 저장하면 영영 남으니 여기서 실제 이름으로 바꾼다.
  if (isPlaceholderGameTitle(gameTitle, appId)) {
    gameTitle = await resolveGameTitle(appId, gameTitle)
  }
  const rating = Number(formData.get("rating") ?? 0)
  if (isPlaceholderGameTitle(gameTitle, appId)) {
    return { ok: false as const, error: "게임 정보가 없습니다." }
  }
  if (rating < 0 || rating > 5) return { ok: false as const, error: "평점은 0–5입니다." }

  const text = String(formData.get("review_text") ?? "")
  const { error } = await supabase.from("game_reviews").upsert(
    {
      user_id: user.id,
      app_id: appId,
      game_title: gameTitle,
      review_text: isBlankContent(text) ? null : text.trim(),
      rating,
      umpc_preset: String(formData.get("umpc_preset") ?? "").trim() || null,
      is_favorite: formData.get("is_favorite") === "on",
    },
    { onConflict: "user_id,app_id" }
  )
  if (error) return { ok: false as const, error: error.message }
  refreshReview(appId)
  return { ok: true as const }
}

export async function deleteGameReview(appId: number) {
  await requireOwner()
  const supabase = await createClient()
  const { error } = await supabase.from("game_reviews").delete().eq("app_id", appId)
  if (error) return { ok: false as const, error: error.message }
  refreshReview(appId)
  return { ok: true as const }
}

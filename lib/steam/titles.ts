import { fetchOwnedGames } from "@/lib/steam/client"
import { fetchAppCatalog } from "@/lib/steam/store"
import { createServiceClient } from "@/lib/supabase/service"
import { isSupabaseConfigured } from "@/lib/utils"
import type { GameReview } from "@/types/steam"

/** Steam API·폼이 이름을 못 줄 때 쓰던 자리표시. 그대로 저장·표시되면 "App 304430"이 보인다. */
export function placeholderGameTitle(appId: number) {
  return `App ${appId}`
}

export function isPlaceholderGameTitle(title: string | null | undefined, appId: number) {
  const value = title?.trim() ?? ""
  if (!value) return true
  if (value === placeholderGameTitle(appId)) return true
  // 예전·다른 경로에서 앱ID만 붙인 변형도 자리표시로 본다.
  return /^App\s+\d+$/i.test(value)
}

function usableName(name: string | null | undefined, appId: number) {
  const value = name?.trim() ?? ""
  return value && !isPlaceholderGameTitle(value, appId) ? value : null
}

/** 소유 게임 → 스토어 카탈로그 순으로 실제 이름을 찾는다. */
export async function resolveGameTitle(appId: number, current?: string | null): Promise<string> {
  const kept = usableName(current, appId)
  if (kept) return kept

  const owned = await fetchOwnedGames().catch(() => null)
  const fromOwned = usableName(owned?.games.find((game) => game.app_id === appId)?.name, appId)
  if (fromOwned) return fromOwned

  const catalog = await fetchAppCatalog(appId).catch(() => null)
  return usableName(catalog?.name, appId) ?? placeholderGameTitle(appId)
}

/** 자리표시 제목만 DB에 실제 이름으로 고친다. 공개 페이지에서도 고칠 수 있게 service_role을 쓴다. */
async function healReviewTitles(rows: { app_id: number; game_title: string }[]) {
  if (!rows.length || !isSupabaseConfigured()) return
  try {
    const supabase = createServiceClient()
    await Promise.all(
      rows.map(({ app_id, game_title }) =>
        supabase
          .from("game_reviews")
          .update({ game_title })
          .eq("app_id", app_id)
          .like("game_title", "App %")
      )
    )
  } catch {
    // 표시는 이미 고쳤으니 저장 실패는 다음 조회에 맡긴다.
  }
}

/**
 * 리뷰 목록의 `App 123` 자리표시를 실제 게임 이름으로 바꾼다.
 * 소유 목록 한 번 + 부족한 앱만 스토어 조회로 N+1을 피한다.
 */
export async function withResolvedGameTitles(reviews: GameReview[]): Promise<GameReview[]> {
  const placeholders = reviews.filter((review) => isPlaceholderGameTitle(review.game_title, review.app_id))
  if (placeholders.length === 0) return reviews

  const owned = await fetchOwnedGames().catch(() => null)
  const ownedNames = new Map(
    (owned?.games ?? [])
      .map((game) => {
        const name = usableName(game.name, game.app_id)
        return name ? ([game.app_id, name] as const) : null
      })
      .filter((entry): entry is readonly [number, string] => Boolean(entry))
  )

  const needCatalog = placeholders.filter((review) => !ownedNames.has(review.app_id))
  const catalogNames = new Map<number, string>()
  await Promise.all(
    needCatalog.map(async (review) => {
      const catalog = await fetchAppCatalog(review.app_id).catch(() => null)
      const name = usableName(catalog?.name, review.app_id)
      if (name) catalogNames.set(review.app_id, name)
    })
  )

  const healed: { app_id: number; game_title: string }[] = []
  const next = reviews.map((review) => {
    if (!isPlaceholderGameTitle(review.game_title, review.app_id)) return review
    const resolved = ownedNames.get(review.app_id) ?? catalogNames.get(review.app_id)
    if (!resolved) return review
    healed.push({ app_id: review.app_id, game_title: resolved })
    return { ...review, game_title: resolved }
  })

  if (healed.length) void healReviewTitles(healed)
  return next
}

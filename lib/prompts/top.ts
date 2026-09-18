import { listPublicPrompts, withPromptThumbnails } from "@/lib/prompts/public"
import type { PodiumEntry } from "@/lib/podium/types"

export const TOP_PROMPTS_LIMIT = 10

// 프롬프트엔 조회수 같은 인기 지표가 없어서, "추천"은 최근 등록순으로 정한다
// (가장 최신 프롬프트 10개 = 지금 추천하는 프롬프트).
export async function getTopPrompts(limit = TOP_PROMPTS_LIMIT): Promise<PodiumEntry[]> {
  const prompts = await listPublicPrompts(limit)
  const withThumbs = await withPromptThumbnails(prompts)
  return withThumbs.map((prompt, index) => ({
    rank: index + 1,
    id: prompt.id,
    title: prompt.title,
    statLabel: prompt.category || "General",
    thumbnailUrl: prompt.thumbnailUrl,
    href: `/p/${prompt.id}`,
  }))
}

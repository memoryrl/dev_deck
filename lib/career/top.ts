import { listPublicCareerSkills } from "@/lib/career/public"
import type { PodiumEntry } from "@/lib/podium/types"

export const TOP_SKILLS_LIMIT = 10

// 스킬은 관리자가 이미 정렬해 둔 순서(sort_order)를 "추천 순위"로 그대로 쓴다 —
// 스킬 관리 화면에서 순서를 바꾸면 이 랭킹도 그대로 따라간다. 개별 상세 화면이
// 없어서 전부 스킬 게시판(/b/skills)으로 연결한다.
export async function getTopSkills(limit = TOP_SKILLS_LIMIT): Promise<PodiumEntry[]> {
  const skills = await listPublicCareerSkills(limit)
  return skills.map((skill, index) => ({
    rank: index + 1,
    id: skill.id,
    title: skill.name,
    statLabel: skill.years ? `${skill.years}년차` : skill.proficiency || skill.category || "",
    thumbnailUrl: null,
    href: "/b/skills",
  }))
}

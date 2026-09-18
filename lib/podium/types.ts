// games/top의 시상대 씬(components/games/podium-topology)과 같은 모양을 다른
// 랭킹(프롬프트·스킬)에도 재사용하기 위한 범용 엔트리 형태.
export type PodiumEntry = {
  rank: number
  id: string
  title: string
  statLabel: string
  thumbnailUrl?: string | null
  href: string
}

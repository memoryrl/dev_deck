import type { MetadataRoute } from "next"
import { listBoardPosts, listBoards } from "@/lib/boards/public"
import { isSystemBoard } from "@/lib/boards/system"
import { listPublicCareerPosts } from "@/lib/career/public"
import { listPublicPrompts } from "@/lib/prompts/public"
import { siteUrl } from "@/lib/seo"
import { fetchOwnedGames } from "@/lib/steam/client"

type Entry = MetadataRoute.Sitemap[number]

// 외부 호출(Steam 등)이 실패해도 사이트맵 전체가 죽지 않게, 구간별로 빈 배열로 떨어뜨린다.
const safe = async <T,>(task: () => Promise<T[]>): Promise<T[]> => task().catch(() => [])

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const at = (path: string, lastModified?: string | Date): Entry => ({ url: `${base}${path}`, lastModified })

  const [prompts, careers, games, boards] = await Promise.all([
    safe(() => listPublicPrompts()),
    safe(() => listPublicCareerPosts()),
    safe(async () => (await fetchOwnedGames()).games),
    safe(async () => (await listBoards()).filter((b) => b.is_active && !isSystemBoard(b) && b.view_role === "visitor")),
  ])
  const boardPosts = await Promise.all(
    boards.map(async (board) => ({ board, posts: await safe(() => listBoardPosts(board.id)) }))
  )

  return [
    at("/"),
    at("/work"),
    at("/games"),
    at("/b/prompts"),
    at("/opensource"),
    ...prompts.map((item) => at(`/p/${item.id}`, item.updated_at)),
    ...careers.map((item) => at(`/work/${item.id}`, item.updated_at)),
    ...games.map((item) => at(`/games/${item.app_id}`)),
    ...boardPosts.flatMap(({ board, posts }) => [
      at(`/b/${board.slug}`),
      ...posts.map((post) => at(`/b/${board.slug}/${post.id}`, post.updated_at)),
    ]),
  ]
}

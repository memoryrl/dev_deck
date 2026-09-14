import { notFound } from "next/navigation"
import { PostList } from "@/components/board/post-list"
import { PublicPostForm } from "@/components/board/public-post-form"
import { PublicContainer } from "@/components/layout/public-container"
import { Card } from "@/components/ui/card"
import { boardPath, roleAtLeast } from "@/lib/access"
import { currentAccessRole } from "@/lib/boards/access"
import { getBoardBySlug, listBoardPosts } from "@/lib/boards/public"
import { isSystemBoard, systemPublicHref } from "@/lib/boards/system"
import { listPublicCareerPosts } from "@/lib/career/public"
import { listPublicPrompts } from "@/lib/prompts/public"
import { listPublicGameReviews } from "@/lib/steam/reviews"

export default async function PublicBoardPage({ params }: { params: { slug: string } }) {
  const board = await getBoardBySlug(params.slug)
  if (!board || !board.is_active) notFound()

  const role = await currentAccessRole()
  if (!roleAtLeast(role, board.view_role)) notFound()

  const system = isSystemBoard(board)
  const genericPosts = system ? [] : await listBoardPosts(board.id)
  const items = system ? await listSystemPublicItems(board.kind) : []
  const canWrite = !system && roleAtLeast(role, board.write_role)

  const listItems = system
    ? items
    : genericPosts.map((post) => ({
        href: `${boardPath(board.slug)}/${post.id}`,
        title: post.title,
        createdAt: post.created_at,
        meta: post.is_published ? null : "비공개",
      }))

  return (
    <PublicContainer>
      <h1 className="font-display text-4xl font-extrabold">{board.name}</h1>
      {board.description ? <p className="mt-2 text-muted-foreground">{board.description}</p> : null}

      <PostList className="mt-8" searchable empty="아직 글이 없습니다." items={listItems} />

      {canWrite ? (
        <Card className="mt-10">
          <h2 className="mb-4 font-display text-xl font-bold">글쓰기</h2>
          <PublicPostForm boardId={board.id} slug={board.slug} />
        </Card>
      ) : null}
    </PublicContainer>
  )
}

async function listSystemPublicItems(kind: "prompts" | "career" | "steam") {
  if (kind === "prompts") {
    const prompts = await listPublicPrompts()
    return prompts.map((prompt) => ({
      href: systemPublicHref(kind, prompt.id),
      title: prompt.title,
      createdAt: prompt.created_at,
      meta: prompt.category,
    }))
  }
  if (kind === "career") {
    const posts = await listPublicCareerPosts()
    return posts.map((post) => ({
      href: systemPublicHref(kind, post.id),
      title: post.title,
      createdAt: post.created_at,
      author: post.company,
      meta: post.post_type,
    }))
  }
  const reviews = await listPublicGameReviews()
  return reviews.map((review) => ({
    href: systemPublicHref(kind, review.id, review.app_id),
    title: review.game_title,
    createdAt: review.created_at,
    meta: `평점 ${review.rating}`,
  }))
}

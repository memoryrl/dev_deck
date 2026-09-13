import Link from "next/link"
import { notFound } from "next/navigation"
import { PublicPostForm } from "@/components/board/public-post-form"
import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { Badge } from "@/components/ui/badge"
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

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12">
        <h1 className="font-display text-4xl font-extrabold">{board.name}</h1>
        {board.description ? <p className="mt-2 text-muted-foreground">{board.description}</p> : null}

        {system ? (
          items.length === 0 ? (
            <p className="mt-10 text-sm">아직 글이 없습니다.</p>
          ) : (
            <div className="mt-8 space-y-4">
              {items.map((item) => (
                <Link key={item.id} href={item.href}>
                  <Card>
                    {item.badge ? (
                      <div className="flex flex-wrap gap-2">
                        <Badge>{item.badge}</Badge>
                      </div>
                    ) : null}
                    <h2 className="mt-1 font-display text-2xl font-bold">{item.title}</h2>
                    {item.excerpt ? (
                      <p className="mt-2 text-sm text-muted-foreground">{item.excerpt}</p>
                    ) : null}
                  </Card>
                </Link>
              ))}
            </div>
          )
        ) : genericPosts.length === 0 ? (
          <p className="mt-10 text-sm">아직 글이 없습니다.</p>
        ) : (
          <div className="mt-8 space-y-4">
            {genericPosts.map((post) => (
              <Link key={post.id} href={`${boardPath(board.slug)}/${post.id}`}>
                <Card>
                  <div className="flex flex-wrap gap-2">
                    {post.is_published ? null : <Badge>비공개</Badge>}
                  </div>
                  <h2 className="mt-1 font-display text-2xl font-bold">{post.title}</h2>
                  {post.excerpt ? (
                    <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        )}

        {canWrite ? (
          <Card className="mt-10">
            <h2 className="mb-4 font-display text-xl font-bold">글쓰기</h2>
            <PublicPostForm boardId={board.id} slug={board.slug} />
          </Card>
        ) : null}
      </main>
      <PublicFooter />
    </div>
  )
}

async function listSystemPublicItems(kind: "prompts" | "career" | "steam") {
  if (kind === "prompts") {
    const prompts = await listPublicPrompts()
    return prompts.map((prompt) => ({
      id: prompt.id,
      href: systemPublicHref(kind, prompt.id),
      title: prompt.title,
      excerpt: null as string | null,
      badge: prompt.category,
    }))
  }
  if (kind === "career") {
    const posts = await listPublicCareerPosts()
    return posts.map((post) => ({
      id: post.id,
      href: systemPublicHref(kind, post.id),
      title: post.title,
      excerpt: post.excerpt,
      badge: post.post_type,
    }))
  }
  const reviews = await listPublicGameReviews()
  return reviews.map((review) => ({
    id: review.id,
    href: systemPublicHref(kind, review.id, review.app_id),
    title: review.game_title,
    excerpt: review.review_text,
    badge: `평점 ${review.rating}`,
  }))
}

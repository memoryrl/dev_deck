import { notFound } from "next/navigation"
import { CareerForm } from "@/app/(dashboard)/career/career-form"
import { ArticleEditPanel } from "@/components/board/article-edit-panel"
import { ArticleReader } from "@/components/board/article-reader"
import { PostPager } from "@/components/board/post-pager"
import { ArticleComments } from "@/components/comments/article-comments"
import { PublicContainer } from "@/components/layout/public-container"
import { Badge } from "@/components/ui/badge"
import { RichContent } from "@/components/editor/rich-content"
import { currentViewer } from "@/lib/boards/access"
import { getPublicCareerPostById, listPublicCareerPosts } from "@/lib/career/public"
import { findNeighbors } from "@/lib/posts/neighbors"
import { formatPeriod } from "@/lib/utils"

export default async function PublicCareerPage({
  params,
}: {
  params: { id: string }
}) {
  const post = await getPublicCareerPostById(params.id)
  if (!post) notFound()
  const { isOwner } = await currentViewer()
  const neighbors = findNeighbors(
    await listPublicCareerPosts(),
    post.id,
    (item) => item.id,
    (item) => `/work/${item.id}`,
    (item) => item.title
  )

  const view = (
    <>
      <Badge className="mt-6">{post.post_type}</Badge>
      <h1 className="mt-4 font-display text-4xl font-extrabold">{post.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {[post.company, post.role, formatPeriod(post.period_start, post.period_end)]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {[...(post.skills ?? []), ...(post.tags ?? [])].map((item) => (
          <Badge key={item}>{item}</Badge>
        ))}
      </div>
      <div className="mt-8">
        <RichContent content={post.content} />
      </div>
    </>
  )

  return (
    <PublicContainer as="article">
      <ArticleReader>
        <PostPager listHref="/work" {...neighbors} />
        {isOwner ? (
          <ArticleEditPanel form={<CareerForm post={post} returnTo={`/work/${post.id}`} deleteTo="/work" />}>
            {view}
          </ArticleEditPanel>
        ) : (
          view
        )}
        <PostPager placement="bottom" listHref="/work" {...neighbors} />
        <ArticleComments targetType="career" targetId={post.id} returnTo={`/work/${post.id}`} />
      </ArticleReader>
    </PublicContainer>
  )
}

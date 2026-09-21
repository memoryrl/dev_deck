import { Suspense } from "react"
import { notFound } from "next/navigation"
import { CareerForm } from "@/app/(dashboard)/career/career-form"
import { ArticleEditPanel } from "@/components/board/article-edit-panel"
import { ArticleReader } from "@/components/board/article-reader"
import { PostPager } from "@/components/board/post-pager"
import { ArticleComments } from "@/components/comments/article-comments"
import { CommentSectionSkeleton, PagerSkeleton } from "@/components/layout/skeletons"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { PublicContainer } from "@/components/layout/public-container"
import { Badge } from "@/components/ui/badge"
import { RichContent } from "@/components/editor/rich-content"
import { currentViewer } from "@/lib/boards/access"
import { getPublicCareerPostById, listPublicCareerPosts } from "@/lib/career/public"
import { findNeighbors } from "@/lib/posts/neighbors"
import { getT } from "@/lib/i18n/dictionary"
import { formatPeriod } from "@/lib/i18n/format"
import type { CareerPost } from "@/types/career"
import { ShareButton } from "@/components/share/share-button"

export default async function PublicCareerPage({
  params,
}: {
  params: { id: string }
}) {
  const post = await getPublicCareerPostById(params.id)
  if (!post) notFound()

  return (
    <PublicContainer as="article">
      <ArticleReader>
        <Suspense fallback={<PagerSkeleton />}>
          <NeighborsPager post={post} />
        </Suspense>
        <Suspense fallback={<CareerArticle post={post} />}>
          <OwnerAwareCareer post={post} />
        </Suspense>
        <Suspense fallback={<PagerSkeleton className="mt-10" />}>
          <NeighborsPager post={post} placement="bottom" />
        </Suspense>
        <Suspense fallback={<CommentSectionSkeleton />}>
          <ArticleComments targetType="career" targetId={post.id} returnTo={`/work/${post.id}`} />
        </Suspense>
      </ArticleReader>
    </PublicContainer>
  )
}

function CareerArticle({ post, canShare = false }: { post: CareerPost; canShare?: boolean }) {
  const { t } = getT()
  return (
    <>
      <PageTitleBanner
        title={post.title}
        className="mt-6"
        actions={canShare ? <ShareButton targetType="career" targetId={post.id} /> : undefined}
      />
      <p className="mt-4 text-sm text-muted-foreground">
        {[post.company, post.role, formatPeriod(post.period_start, post.period_end, t("date.present"))]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{post.post_type}</Badge>
        {[...(post.skills ?? []), ...(post.tags ?? [])].map((item) => (
          <Badge key={item}>{item}</Badge>
        ))}
      </div>
      <div className="mt-8">
        <RichContent content={post.content} />
      </div>
    </>
  )
}

async function NeighborsPager({ post, placement }: { post: CareerPost; placement?: "bottom" }) {
  const allPosts = await listPublicCareerPosts()
  const neighbors = findNeighbors(
    allPosts,
    post.id,
    (item) => item.id,
    (item) => `/work/${item.id}`,
    (item) => item.title
  )
  return <PostPager placement={placement} listHref="/work" {...neighbors} />
}

async function OwnerAwareCareer({ post }: { post: CareerPost }) {
  const { isOwner } = await currentViewer()
  const article = <CareerArticle post={post} canShare={isOwner} />
  if (!isOwner) return article
  return (
    <ArticleEditPanel form={<CareerForm post={post} returnTo={`/work/${post.id}`} deleteTo="/work" />}>
      {article}
    </ArticleEditPanel>
  )
}

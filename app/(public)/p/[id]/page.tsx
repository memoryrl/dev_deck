import { Suspense } from "react"
import { notFound } from "next/navigation"
import { PromptForm } from "@/app/(dashboard)/promptkit/prompt-form"
import { ArticleEditPanel } from "@/components/board/article-edit-panel"
import { ArticleReader } from "@/components/board/article-reader"
import { PostPager } from "@/components/board/post-pager"
import { ArticleComments } from "@/components/comments/article-comments"
import { CopyButton } from "@/components/layout/copy-button"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { PublicContainer } from "@/components/layout/public-container"
import { PromptBodyToggle } from "@/components/prompts/prompt-body-toggle"
import { ResultPreview } from "@/components/prompts/result-preview"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"
import { CommentSectionSkeleton, PagerSkeleton } from "@/components/layout/skeletons"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { currentViewer } from "@/lib/boards/access"
import { plainTextFromContent } from "@/lib/content"
import { findNeighbors } from "@/lib/posts/neighbors"
import { resolveResultEmbed } from "@/lib/embeds/result-preview"
import { getPublicPromptById, listPublicPrompts } from "@/lib/prompts/public"
import type { Prompt } from "@/types/prompt"
import { ShareButton } from "@/components/share/share-button"

export default async function PublicPromptPage(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params;
  const prompt = await getPublicPromptById(params.id)
  if (!prompt) notFound()

  return (
    <PublicContainer as="article">
      <ArticleReader>
        <Suspense fallback={<PagerSkeleton />}>
          <NeighborsPager prompt={prompt} />
        </Suspense>
        <Suspense fallback={<PromptArticle prompt={prompt} />}>
          <OwnerAwarePrompt prompt={prompt} />
        </Suspense>
        <Suspense fallback={<PagerSkeleton className="mt-10" />}>
          <NeighborsPager prompt={prompt} placement="bottom" />
        </Suspense>
        <Suspense fallback={<CommentSectionSkeleton />}>
          <ArticleComments targetType="prompt" targetId={prompt.id} returnTo={`/p/${prompt.id}`} />
        </Suspense>
      </ArticleReader>
    </PublicContainer>
  )
}

function PromptArticle({ prompt, canShare = false }: { prompt: Prompt; canShare?: boolean }) {
  return (
    <>
      <PageTitleBanner
        title={prompt.title}
        breadcrumb={[{ label: "프롬프트", href: "/b/prompts" }]}
        actions={
          <>
            {canShare ? <ShareButton targetType="prompt" targetId={prompt.id} /> : null}
            <CopyButton text={plainTextFromContent(prompt.content) || prompt.content} />
          </>
        }
        className="mt-6"
      />
      <div className="mt-5 flex flex-wrap gap-2">
        <Badge>{prompt.category}</Badge>
        {(prompt.tags ?? []).map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
      <section className="mt-8">
        <p className="text-sm font-semibold text-muted-foreground">예상 결과물</p>
        {prompt.result_html?.trim() ? (
          <Suspense fallback={<Skeleton className="mt-4 h-48 w-full rounded-xl" />}>
            <ResultPreviewSection html={prompt.result_html} />
          </Suspense>
        ) : (
          <EmptyPlaceholder className="mt-4">아직 등록된 결과물이 없습니다.</EmptyPlaceholder>
        )}
      </section>
      <PromptBodyToggle content={prompt.content} />
    </>
  )
}

async function ResultPreviewSection({ html }: { html: string }) {
  const embed = await resolveResultEmbed(html)
  return <ResultPreview html={html} embed={embed} />
}

async function NeighborsPager({ prompt, placement }: { prompt: Prompt; placement?: "bottom" }) {
  const allPrompts = await listPublicPrompts()
  const neighbors = findNeighbors(
    allPrompts,
    prompt.id,
    (item) => item.id,
    (item) => `/p/${item.id}`,
    (item) => item.title
  )
  return <PostPager placement={placement} listHref="/b/prompts" {...neighbors} />
}

// 본문 컴포넌트를 fallback과 결과에서 각각 새로 만든다. 같은 JSX 객체를 폴백과
// children에 재사용하면 Suspense가 폴백을 걷을 때 본문까지 같이 언마운트된다.
async function OwnerAwarePrompt({ prompt }: { prompt: Prompt }) {
  const { isOwner } = await currentViewer()
  const article = <PromptArticle prompt={prompt} canShare={isOwner} />
  if (!isOwner) return article
  return (
    <ArticleEditPanel form={<PromptForm prompt={prompt} returnTo={`/p/${prompt.id}`} deleteTo="/b/prompts" />}>
      {article}
    </ArticleEditPanel>
  )
}

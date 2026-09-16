import { notFound } from "next/navigation"
import { PromptForm } from "@/app/(dashboard)/promptkit/prompt-form"
import { ArticleEditPanel } from "@/components/board/article-edit-panel"
import { ArticleReader } from "@/components/board/article-reader"
import { PostPager } from "@/components/board/post-pager"
import { ArticleComments } from "@/components/comments/article-comments"
import { CopyButton } from "@/components/layout/copy-button"
import { PublicContainer } from "@/components/layout/public-container"
import { PromptBodyToggle } from "@/components/prompts/prompt-body-toggle"
import { ResultPreview } from "@/components/prompts/result-preview"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"
import { Badge } from "@/components/ui/badge"
import { currentViewer } from "@/lib/boards/access"
import { plainTextFromContent } from "@/lib/content"
import { findNeighbors } from "@/lib/posts/neighbors"
import { resolveResultEmbed } from "@/lib/embeds/result-preview"
import { getPublicPromptById, listPublicPrompts } from "@/lib/prompts/public"

export default async function PublicPromptPage({
  params,
}: {
  params: { id: string }
}) {
  const prompt = await getPublicPromptById(params.id)
  if (!prompt) notFound()
  const { isOwner } = await currentViewer()
  const resultEmbed = prompt.result_html?.trim() ? await resolveResultEmbed(prompt.result_html) : null
  const neighbors = findNeighbors(
    await listPublicPrompts(),
    prompt.id,
    (item) => item.id,
    (item) => `/p/${item.id}`,
    (item) => item.title
  )

  const view = (
    <>
      <Badge className="mt-6">{prompt.category}</Badge>
      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="min-w-0 font-display text-4xl font-extrabold">{prompt.title}</h1>
        <CopyButton
          className="shrink-0"
          text={plainTextFromContent(prompt.content) || prompt.content}
        />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {(prompt.tags ?? []).map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
      <section className="mt-8">
        <p className="text-sm font-semibold text-muted-foreground">예상 결과물</p>
        {prompt.result_html?.trim() ? (
          <ResultPreview html={prompt.result_html} embed={resultEmbed} />
        ) : (
          <EmptyPlaceholder className="mt-4">아직 등록된 결과물이 없습니다.</EmptyPlaceholder>
        )}
      </section>
      <PromptBodyToggle content={prompt.content} />
    </>
  )

  return (
    <PublicContainer as="article">
      <ArticleReader>
        <PostPager listHref="/b/prompts" {...neighbors} />
        {isOwner ? (
          <ArticleEditPanel
            form={<PromptForm prompt={prompt} returnTo={`/p/${prompt.id}`} deleteTo="/b/prompts" />}
          >
            {view}
          </ArticleEditPanel>
        ) : (
          view
        )}
        <PostPager placement="bottom" listHref="/b/prompts" {...neighbors} />
        <ArticleComments targetType="prompt" targetId={prompt.id} returnTo={`/p/${prompt.id}`} />
      </ArticleReader>
    </PublicContainer>
  )
}

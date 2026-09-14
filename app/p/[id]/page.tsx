import { notFound } from "next/navigation"
import { ArticleReader } from "@/components/board/article-reader"
import { PostPager } from "@/components/board/post-pager"
import { CopyButton } from "@/components/layout/copy-button"
import { PublicContainer } from "@/components/layout/public-container"
import { Badge } from "@/components/ui/badge"
import { RichContent } from "@/components/editor/rich-content"
import { plainTextFromContent } from "@/lib/content"
import { findNeighbors } from "@/lib/posts/neighbors"
import { getPublicPromptById, listPublicPrompts } from "@/lib/prompts/public"

export default async function PublicPromptPage({
  params,
}: {
  params: { id: string }
}) {
  const prompt = await getPublicPromptById(params.id)
  if (!prompt) notFound()
  const neighbors = findNeighbors(
    await listPublicPrompts(),
    prompt.id,
    (item) => item.id,
    (item) => `/p/${item.id}`,
    (item) => item.title
  )

  return (
    <PublicContainer as="article">
      <ArticleReader>
        <PostPager listHref="/b/prompts" {...neighbors} />
        <Badge className="mt-6">{prompt.category}</Badge>
        <h1 className="mt-4 font-display text-4xl font-extrabold">{prompt.title}</h1>
        <div className="mt-5 flex flex-wrap gap-2">
          {(prompt.tags ?? []).map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
        <div className="mt-6">
          <CopyButton text={plainTextFromContent(prompt.content) || prompt.content} />
        </div>
        <div className="mt-8">
          <RichContent content={prompt.content} />
        </div>
        <PostPager className="mt-10" listHref="/b/prompts" {...neighbors} />
      </ArticleReader>
    </PublicContainer>
  )
}

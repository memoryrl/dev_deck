import Link from "next/link"
import { notFound } from "next/navigation"
import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { CopyButton } from "@/components/layout/copy-button"
import { Badge } from "@/components/ui/badge"
import { RichContent } from "@/components/editor/rich-content"
import { plainTextFromContent } from "@/lib/content"
import { getPublicPromptById } from "@/lib/prompts/public"

export default async function PublicPromptPage({
  params,
}: {
  params: { id: string }
}) {
  const prompt = await getPublicPromptById(params.id)
  if (!prompt) notFound()

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <article className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <Badge>{prompt.category}</Badge>
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
        <p className="mt-10 text-sm">
          <Link href="/" className="font-semibold underline">
            홈으로
          </Link>
        </p>
      </article>
      <PublicFooter />
    </div>
  )
}

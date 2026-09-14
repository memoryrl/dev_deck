import { Markdown } from "@/components/ui/markdown"
import { looksLikeHtml, sanitizeRichHtml } from "@/lib/content"

export function RichContent({ content }: { content: string }) {
  if (!content.trim()) return null

  if (looksLikeHtml(content)) {
    return (
      <div
        className="prose-deck rich-content space-y-3"
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(content) }}
      />
    )
  }

  return <Markdown content={content} />
}

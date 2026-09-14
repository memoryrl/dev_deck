import { Markdown } from "@/components/ui/markdown"
import { looksLikeHtml, sanitizeRichHtml } from "@/lib/content"
import { cn } from "@/lib/utils"

export function RichContent({ content, className }: { content: string; className?: string }) {
  if (!content.trim()) return null

  if (looksLikeHtml(content)) {
    return (
      <div
        className={cn("prose-deck rich-content space-y-3", className)}
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(content) }}
      />
    )
  }

  return <Markdown content={content} className={className} />
}

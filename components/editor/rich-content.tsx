import { Markdown } from "@/components/ui/markdown"
import { looksLikeHtml, sanitizeRichHtml } from "@/lib/content"
import { cn } from "@/lib/utils"

/**
 * 저장된 HTML/마크다운을 정리(sanitize)해서 보여 준다.
 * variant="article"은 글 상세 본문용 — 읽기 폭을 제한하고 글자를 조금 키운다.
 */
export function RichContent({
  content,
  className,
  variant,
}: {
  content: string
  className?: string
  variant?: "article"
}) {
  if (!content.trim()) return null
  const merged = cn(variant === "article" && "prose-article", className)

  if (looksLikeHtml(content)) {
    return (
      <div
        className={cn("prose-deck rich-content space-y-3", merged)}
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(content) }}
      />
    )
  }

  return <Markdown content={content} className={merged || undefined} />
}

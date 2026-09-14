import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import { cn } from "@/lib/utils"

export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("prose-deck space-y-3", className)}>
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>
    </div>
  )
}

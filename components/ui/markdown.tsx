import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-deck space-y-3 text-[15px]">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>
    </div>
  )
}

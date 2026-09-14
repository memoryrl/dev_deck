import { cn } from "@/lib/utils"

/** 공개 헤더·푸터(`max-w-6xl px-5`)와 같은 본문 폭 */
export function PublicContainer({
  as: Tag = "main",
  className,
  children,
}: {
  as?: "main" | "article"
  className?: string
  children: React.ReactNode
}) {
  return (
    <Tag className={cn("mx-auto w-full max-w-6xl flex-1 px-5 py-12", className)}>
      {children}
    </Tag>
  )
}

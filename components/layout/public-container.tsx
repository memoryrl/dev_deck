import { cn } from "@/lib/utils"

/**
 * 공개 헤더·푸터(`max-w-6xl px-5`)와 같은 본문 폭.
 * 바깥은 항상 <main> 랜드마크이고, as="article"이면 본문을 <article>로 한 겹 더 감싼다
 * (상세 페이지에 main이 없고 article만 있던 문제).
 */
export function PublicContainer({
  as = "main",
  className,
  children,
}: {
  as?: "main" | "article"
  className?: string
  children: React.ReactNode
}) {
  return (
    <main id="main-content" tabIndex={-1} className={cn("mx-auto w-full max-w-6xl flex-1 px-5 py-12 focus:outline-none", className)}>
      {as === "article" ? <article>{children}</article> : children}
    </main>
  )
}

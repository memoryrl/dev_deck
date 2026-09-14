import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { NeighborLink } from "@/lib/posts/neighbors"
import { cn } from "@/lib/utils"

export function PostPager({
  listHref,
  listLabel = "목록으로",
  prev,
  next,
  className,
}: {
  listHref: string
  listLabel?: string
  prev?: NeighborLink | null
  next?: NeighborLink | null
  className?: string
}) {
  return (
    <nav
      className={cn("flex flex-wrap items-center justify-between gap-2", className)}
      aria-label="게시물 이동"
    >
      <Button asChild variant="outline" size="sm">
        <Link href={listHref}>{listLabel}</Link>
      </Button>
      <div className="flex items-center gap-2">
        {prev ? (
          <Button asChild variant="outline" size="sm">
            <Link href={prev.href} title={prev.title}>
              <ChevronLeft />
              이전
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft />
            이전
          </Button>
        )}
        {next ? (
          <Button asChild variant="outline" size="sm">
            <Link href={next.href} title={next.title}>
              다음
              <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            다음
            <ChevronRight />
          </Button>
        )}
      </div>
    </nav>
  )
}

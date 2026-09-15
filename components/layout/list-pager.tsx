import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { listQueryHref, pageWindow, type PagedResult } from "@/lib/pagination"
import { cn } from "@/lib/utils"

export function ListPager({
  pathname,
  param,
  result,
  extraParams,
  className,
}: {
  pathname: string
  param?: string
  result: PagedResult<unknown>
  extraParams?: Record<string, string | number | undefined>
  className?: string
}) {
  if (result.total === 0) return null

  const pageParam = param ?? "page"
  const base = extraParams ?? {}
  const prev = result.page > 1 ? result.page - 1 : null
  const next = result.page < result.pageCount ? result.page + 1 : null
  const from = (result.page - 1) * result.pageSize + 1
  const to = Math.min(result.page * result.pageSize, result.total)

  return (
    <nav
      className={cn("mt-4 flex flex-wrap items-center justify-between gap-3", className)}
      aria-label="목록 페이지"
    >
      <p className="text-sm text-muted-foreground">
        {from}–{to} / 총 {result.total}건
      </p>
      {result.pageCount > 1 ? (
        <div className="flex items-center gap-1">
          {prev ? (
            <Button asChild variant="outline" size="sm">
              <Link href={listQueryHref(pathname, base, { [pageParam]: prev })}>
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
          {pageWindow(result.page, result.pageCount).map((item) =>
            item === result.page ? (
              <span
                key={item}
                aria-current="page"
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-foreground px-2 text-sm font-semibold text-background"
              >
                {item}
              </span>
            ) : (
              <Button key={item} asChild variant="outline" size="sm">
                <Link href={listQueryHref(pathname, base, { [pageParam]: item })}>{item}</Link>
              </Button>
            )
          )}
          {next ? (
            <Button asChild variant="outline" size="sm">
              <Link href={listQueryHref(pathname, base, { [pageParam]: next })}>
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
      ) : null}
    </nav>
  )
}

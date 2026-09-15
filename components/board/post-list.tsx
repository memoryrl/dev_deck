import Link from "next/link"
import { ChevronDown, RefreshCw } from "lucide-react"
import { ListPager } from "@/components/layout/list-pager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { listQueryHref, type PagedResult } from "@/lib/pagination"
import { cn, formatBoardDateTime } from "@/lib/utils"

export type PostListRow = {
  href: string
  title: string
  createdAt: string
  author?: string | null
  meta?: string | null
}

export function PostList({
  items,
  empty = "아직 글이 없습니다.",
  searchable = false,
  showCount,
  authorFallback = "관리자",
  className,
  paged,
  pathname,
  searchQuery = "",
  extraParams,
}: {
  items: PostListRow[]
  empty?: string
  searchable?: boolean
  showCount?: boolean
  authorFallback?: string
  className?: string
  paged?: PagedResult<unknown>
  pathname?: string
  searchQuery?: string
  extraParams?: Record<string, string | number | undefined>
}) {
  const displayCount = showCount ?? Boolean(searchable || paged)
  const rows = items
  const searched = Boolean(searchQuery.trim())
  const extra = extraParams ?? {}

  return (
    <div className={cn(className)}>
      {searchable && pathname ? (
        <form action={pathname} className="flex items-center gap-2">
          {Object.entries(extra).map(([key, value]) =>
            value === undefined || value === "" ? null : (
              <input key={key} type="hidden" name={key} value={String(value)} />
            )
          )}
          <div className="relative shrink-0">
            <select
              defaultValue="title"
              aria-label="검색 조건"
              className="h-10 appearance-none rounded-full border border-input bg-background pl-4 pr-9 text-sm font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="title">제목</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Input
            name="q"
            defaultValue={searchQuery}
            placeholder="검색어를 입력하세요"
            className="h-10 flex-1 rounded-full shadow-none"
            aria-label="검색어"
          />
          <Button type="submit" className="h-10 rounded-full px-5">
            검색
          </Button>
          <Button asChild variant="outline" size="icon" className="size-10 shrink-0 rounded-full">
            <Link href={listQueryHref(pathname, extra, { page: 1 })} aria-label="검색 초기화">
              <RefreshCw />
            </Link>
          </Button>
        </form>
      ) : null}

      {displayCount ? (
        <p className={cn("text-sm text-muted-foreground", searchable ? "mt-4" : null)}>
          총 {paged?.total ?? rows.length}건
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className={cn("text-sm text-muted-foreground", displayCount ? "mt-8" : "mt-5")}>
          {searched ? "검색 결과가 없습니다." : empty}
        </p>
      ) : (
        <ul
          className={cn(
            "divide-y border-y bg-white dark:bg-card",
            displayCount || searchable ? "mt-2" : null
          )}
        >
          {rows.map((item, index) => {
            const author = item.author?.trim() || authorFallback
            const number = paged ? (paged.page - 1) * paged.pageSize + index + 1 : index + 1
            return (
              <li key={`${item.href}-${index}`}>
                <Link
                  href={item.href}
                  className="block px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="min-w-0 text-[15px] leading-snug">
                      <span className="text-muted-foreground">No. {number}</span>
                      <span className="mx-2 text-foreground/20">|</span>
                      <span className="font-semibold text-foreground">{item.title}</span>
                    </p>
                    {item.meta ? (
                      <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">{item.meta}</span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    작성자 {author}
                    <span className="mx-1.5 text-foreground/20">|</span>
                    등록일 {formatBoardDateTime(item.createdAt)}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {paged && pathname ? (
        <ListPager
          pathname={pathname}
          result={paged}
          extraParams={{ ...extra, q: searchQuery || undefined }}
        />
      ) : null}
    </div>
  )
}

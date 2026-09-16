import Link from "next/link"
import { ChevronDown, RefreshCw } from "lucide-react"
import { ListPager } from "@/components/layout/list-pager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { listQueryHref, type PagedResult } from "@/lib/pagination"
import { getT } from "@/lib/i18n/dictionary"
import { formatBoardDateTime } from "@/lib/i18n/format"
import { cn } from "@/lib/utils"

export type PostListRow = {
  href: string
  title: string
  createdAt: string
  author?: string | null
  meta?: string | null
}

export function PostList({
  items,
  empty,
  searchable = false,
  showCount,
  authorFallback,
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
  const { t, locale } = getT()
  const emptyText = empty ?? t("list.emptyPosts")
  const authorName = authorFallback ?? t("role.owner")
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
              aria-label={t("common.searchField")}
              className="h-10 appearance-none rounded-full border border-input bg-background pl-4 pr-9 text-sm font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="title">{t("common.title")}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Input
            name="q"
            defaultValue={searchQuery}
            placeholder={t("common.searchPlaceholder")}
            className="h-10 flex-1 rounded-full shadow-none"
            aria-label={t("common.searchPlaceholder")}
          />
          <Button type="submit" className="h-10 rounded-full px-5">
            {t("common.search")}
          </Button>
          <Button asChild variant="outline" size="icon" className="size-10 shrink-0 rounded-full">
            <Link href={listQueryHref(pathname, extra, { page: 1 })} aria-label={t("common.searchReset")}>
              <RefreshCw />
            </Link>
          </Button>
        </form>
      ) : null}

      {displayCount ? (
        <p className={cn("text-sm text-muted-foreground", searchable ? "mt-4" : null)}>
          {t("common.totalCount", { count: paged?.total ?? rows.length })}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className={cn("text-sm text-muted-foreground", displayCount ? "mt-8" : "mt-5")}>
          {searched ? t("list.emptySearch") : emptyText}
        </p>
      ) : (
        <ul
          className={cn(
            "divide-y border-y bg-white dark:bg-card",
            displayCount || searchable ? "mt-2" : null
          )}
        >
          {rows.map((item, index) => {
            const author = item.author?.trim() || authorName
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
                    {t("common.author")} {author}
                    <span className="mx-1.5 text-foreground/20">|</span>
                    {t("common.postedAt")} {formatBoardDateTime(item.createdAt, locale)}
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

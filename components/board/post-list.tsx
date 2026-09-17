import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { ListPager } from "@/components/layout/list-pager"
import { Button } from "@/components/ui/button"
import { CustomSelect } from "@/components/ui/custom-select"
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
  thumbnailUrl?: string | null
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
  layout = "list",
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
  layout?: "list" | "cards"
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
          <CustomSelect
            defaultValue="title"
            options={[{ value: "title", label: t("common.title") }]}
            aria-label={t("common.searchField")}
            className="shrink-0"
            triggerClassName="h-10 rounded-full bg-background pl-4 pr-3 font-medium"
          />
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
      ) : layout === "cards" ? (
        <ul
          className={cn(
            "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
            displayCount || searchable ? "mt-4" : null
          )}
        >
          {rows.map((item, index) => {
            const author = item.author?.trim() || authorName
            const number = paged ? (paged.page - 1) * paged.pageSize + index + 1 : index + 1
            const thumb = item.thumbnailUrl?.trim()
            return (
              <li key={`${item.href}-${index}`}>
                <Link
                  href={item.href}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:bg-muted/30 dark:bg-card"
                >
                  <div className="aspect-[16/10] w-full overflow-hidden bg-[hsl(var(--lux-sand)/0.55)]">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
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
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
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

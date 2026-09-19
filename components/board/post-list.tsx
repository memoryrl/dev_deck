import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { BulletinList } from "@/components/board/bulletin-list"
import type { PostListRow } from "@/components/board/types"
import { Button } from "@/components/ui/button"
import { CustomSelect } from "@/components/ui/custom-select"
import { Input } from "@/components/ui/input"
import { listQueryHref, type PagedResult } from "@/lib/pagination"
import { getT } from "@/lib/i18n/dictionary"
import { formatBoardDateTime } from "@/lib/i18n/format"
import { cn } from "@/lib/utils"

export type { PostListRow }

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
  endAction,
  composer,
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
  layout?: "list" | "cards" | "feed"
  endAction?: React.ReactNode
  composer?: React.ReactNode
}) {
  const { t, locale } = getT()
  const emptyText = empty ?? t("list.emptyPosts")
  const authorName = authorFallback ?? t("role.owner")
  const displayCount = showCount ?? Boolean(searchable || paged)
  const rows = items
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
            triggerClassName="h-9 rounded-sm bg-field px-3 font-medium"
          />
          <Input
            name="q"
            defaultValue={searchQuery}
            placeholder={t("common.searchPlaceholder")}
            className="h-9 flex-1 rounded-sm shadow-none"
            aria-label={t("common.searchPlaceholder")}
          />
          <Button type="submit" className="h-9 rounded-sm px-4">
            {t("common.search")}
          </Button>
          <Button asChild variant="outline" size="icon" className="size-9 shrink-0 rounded-sm">
            <Link href={listQueryHref(pathname, extra, { page: 1 })} aria-label={t("common.searchReset")}>
              <RefreshCw />
            </Link>
          </Button>
          {endAction}
        </form>
      ) : endAction ? (
        <div className="flex justify-end">{endAction}</div>
      ) : null}

      {composer}

      {displayCount ? (
        <p className={cn("text-xs tabular-nums text-muted-foreground", searchable ? "mt-3" : null)}>
          {t("common.totalCount", { count: paged?.total ?? rows.length })}
        </p>
      ) : null}

      {layout === "feed" ? (
        rows.length === 0 ? (
          <p className={cn("text-sm text-muted-foreground", displayCount ? "mt-8" : "mt-5")}>
            {searchQuery.trim() ? t("list.emptySearch") : emptyText}
          </p>
        ) : (
          <div
            className={cn(
              "grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-8",
              displayCount || searchable ? "mt-5" : null
            )}
          >
            {[0, 1].map((col) => (
              <div key={col} className={cn("flex flex-col gap-6", col === 1 && "sm:mt-14")}>
                {rows
                  .map((item, index) => ({ item, index }))
                  .filter((_, i) => i % 2 === col)
                  .map(({ item, index }) => {
                    const author = item.author?.trim() || authorName
                    const number = paged
                      ? paged.total - ((paged.page - 1) * paged.pageSize + index)
                      : rows.length - index
                    const thumb = item.thumbnailUrl?.trim()
                    const excerpt = item.excerpt?.trim()
                    return (
                      <Link
                        key={`${item.href}-${index}`}
                        href={item.href}
                        className="group block overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-[0_18px_40px_-24px_hsl(var(--foreground)/0.35)]"
                      >
                        {thumb ? (
                          <div className="aspect-[16/9] w-full overflow-hidden bg-[hsl(var(--lux-sand)/0.55)]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumb}
                              alt=""
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                            />
                          </div>
                        ) : null}
                        <div className="p-5">
                          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <span className="font-display tabular-nums text-[hsl(var(--lux-cognac))]">
                              {String(number).padStart(2, "0")}
                            </span>
                            {item.meta ? (
                              <>
                                <span className="text-foreground/20">·</span>
                                <span className="truncate">{item.meta}</span>
                              </>
                            ) : null}
                          </div>
                          <h3 className="mt-2 font-display text-lg font-bold leading-snug tracking-tight group-hover:underline">
                            {item.title}
                          </h3>
                          {excerpt ? (
                            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                              {excerpt}
                            </p>
                          ) : null}
                          <p className="mt-4 text-xs text-muted-foreground">
                            {author}
                            <span className="mx-1.5 text-foreground/20">·</span>
                            {formatBoardDateTime(item.createdAt, locale)}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
              </div>
            ))}
          </div>
        )
      ) : layout === "cards" ? (
        rows.length === 0 ? (
          <p className={cn("text-sm text-muted-foreground", displayCount ? "mt-8" : "mt-5")}>
            {searchQuery.trim() ? t("list.emptySearch") : emptyText}
          </p>
        ) : (
          <ul
            className={cn(
              "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
              displayCount || searchable ? "mt-4" : null
            )}
          >
            {rows.map((item, index) => {
              const author = item.author?.trim() || authorName
              const number = paged
                ? paged.total - ((paged.page - 1) * paged.pageSize + index)
                : rows.length - index
              const thumb = item.thumbnailUrl?.trim()
              return (
                <li key={`${item.href}-${index}`}>
                  <Link
                    href={item.href}
                    className="flex h-full flex-col overflow-hidden border border-foreground/10 bg-background transition hover:border-foreground/25 hover:bg-[hsl(var(--lux-champagne)/0.12)]"
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
                          <span className="font-mono text-xs tabular-nums text-muted-foreground">No. {number}</span>
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
        )
      ) : (
        <BulletinList
          className={cn(displayCount || searchable ? "mt-3" : null)}
          items={rows}
          empty={emptyText}
          paged={paged}
          pathname={pathname}
          searchQuery={searchQuery}
          extraParams={extra}
          authorFallback={authorFallback}
          variant={searchable || paged ? "board" : "teaser"}
        />
      )}
    </div>
  )
}

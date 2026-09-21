import Link from "next/link"
import { ListPager } from "@/components/layout/list-pager"
import type { PostListRow } from "@/components/board/types"
import { getT } from "@/lib/i18n/dictionary"
import { formatBoardDate, formatBoardDateTime } from "@/lib/i18n/format"
import type { PagedResult } from "@/lib/pagination"
import { cn } from "@/lib/utils"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"

function rowNumber(index: number, paged?: PagedResult<unknown>, itemCount = 0) {
  if (paged) return paged.total - ((paged.page - 1) * paged.pageSize + index)
  return itemCount - index
}

export async function BulletinList({
  items,
  empty,
  paged,
  pathname,
  searchQuery = "",
  extraParams,
  authorFallback,
  variant = "board",
  className,
}: {
  items: PostListRow[]
  empty: string
  paged?: PagedResult<unknown>
  pathname?: string
  searchQuery?: string
  extraParams?: Record<string, string | number | undefined>
  authorFallback?: string
  variant?: "board" | "teaser"
  className?: string
}) {
  const { t, locale } = await getT()
  const extra = extraParams ?? {}
  const searched = Boolean(searchQuery.trim())
  const authorName = authorFallback ?? t("role.owner")
  const compact = variant === "teaser"
  const showMetaCol = !compact && items.some((item) => Boolean(item.meta))
  const emptyText = searched ? t("list.emptySearch") : empty
  const colCount = (compact ? 3 : 4) + (showMetaCol ? 1 : 0)

  return (
    <div className={cn(className)}>
      <div className={compact ? undefined : "overflow-x-auto"}>
        <table className={cn("w-full border-collapse text-sm", compact ? null : "min-w-[36rem]")}>
          <caption className="sr-only">{t("list.boardCaption")}</caption>
          <thead>
            <tr className="border-y border-foreground/15 bg-[hsl(var(--lux-sand)/0.55)] text-[11px] font-semibold tracking-[0.14em] text-muted-foreground dark:bg-muted/50">
              <th scope="col" className="w-16 px-2 py-2.5 text-center">
                {t("list.no")}
              </th>
              <th scope="col" className="px-3 py-2.5 text-left">
                {t("common.title")}
              </th>
              {compact ? null : (
                <th scope="col" className="w-28 px-2 py-2.5 text-center">
                  {t("common.author")}
                </th>
              )}
              <th scope="col" className="w-28 px-2 py-2.5 text-center">
                {t("common.postedAt")}
              </th>
              {showMetaCol ? (
                <th scope="col" className="w-28 px-2 py-2.5 text-center">
                  {t("list.category")}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={colCount}>
                  <EmptyPlaceholder variant="plain" className="py-16">
                    {emptyText}
                  </EmptyPlaceholder>
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const author = item.author?.trim() || authorName
                const number = rowNumber(index, paged, items.length)
                const posted = formatBoardDate(item.createdAt)
                const postedFull = formatBoardDateTime(item.createdAt, locale)
                return (
                  <tr
                    key={`${item.href}-${index}`}
                    className="group border-b border-foreground/8 transition-colors hover:bg-[hsl(var(--lux-champagne)/0.12)]"
                  >
                    <td className="px-2 py-3 text-center font-mono text-[13px] tabular-nums text-muted-foreground">
                      {number}
                    </td>
                    <td className={cn("px-3", compact ? "py-2.5" : "py-3")}>
                      <Link
                        href={item.href}
                        className="line-clamp-1 font-medium text-foreground decoration-[hsl(var(--lux-cognac)/0.45)] underline-offset-4 transition-colors group-hover:underline"
                      >
                        {item.title}
                      </Link>
                    </td>
                    {compact ? null : (
                      <td className="px-2 py-3 text-center text-xs text-muted-foreground">
                        <span className="line-clamp-1">{author}</span>
                      </td>
                    )}
                    <td
                      className="whitespace-nowrap px-2 py-3 text-center font-mono text-xs tabular-nums text-muted-foreground"
                      title={postedFull}
                    >
                      {posted}
                    </td>
                    {showMetaCol ? (
                      <td className="px-2 py-3 text-center">
                        {item.meta ? (
                          <span className="inline-block max-w-[7rem] truncate border border-foreground/10 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {item.meta}
                          </span>
                        ) : (
                          <span className="text-foreground/20">—</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
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

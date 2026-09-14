"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
}: {
  items: PostListRow[]
  empty?: string
  searchable?: boolean
  showCount?: boolean
  authorFallback?: string
  className?: string
}) {
  const [draft, setDraft] = useState("")
  const [query, setQuery] = useState("")
  const displayCount = showCount ?? searchable

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) => item.title.toLowerCase().includes(needle))
  }, [items, query])

  function submitSearch(event: React.FormEvent) {
    event.preventDefault()
    setQuery(draft)
  }

  function resetSearch() {
    setDraft("")
    setQuery("")
  }

  return (
    <div className={cn(className)}>
      {searchable ? (
        <form onSubmit={submitSearch} className="flex items-center gap-2">
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
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="검색어를 입력하세요"
            className="h-10 flex-1 rounded-full shadow-none"
            aria-label="검색어"
          />
          <Button type="submit" className="h-10 rounded-full px-5">
            검색
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-full"
            onClick={resetSearch}
            aria-label="검색 초기화"
          >
            <RefreshCw />
          </Button>
        </form>
      ) : null}

      {displayCount ? (
        <p className={cn("text-sm text-muted-foreground", searchable ? "mt-4" : null)}>총 {rows.length}건</p>
      ) : null}

      {rows.length === 0 ? (
        <p className={cn("text-sm text-muted-foreground", displayCount ? "mt-8" : "mt-5")}>
          {query.trim() ? "검색 결과가 없습니다." : empty}
        </p>
      ) : (
        <ul className={cn("divide-y border-y", displayCount || searchable ? "mt-2" : null)}>
          {rows.map((item, index) => {
            const author = item.author?.trim() || authorFallback
            return (
              <li key={`${item.href}-${index}`}>
                <Link
                  href={item.href}
                  className="block rounded-sm px-1 py-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="min-w-0 text-[15px] leading-snug">
                      <span className="text-muted-foreground">No. {index + 1}</span>
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
    </div>
  )
}

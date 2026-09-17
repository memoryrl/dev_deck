"use client"

import { useState } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { fetchPageViews } from "@/app/(dashboard)/site/login-history/actions"
import { cn, formatBoardDateTime } from "@/lib/utils"
import type { LoginHistoryEntry, PageViewEntry } from "@/types/login-history"

export function LoginHistoryRow({
  entry,
  number,
  pageCount,
}: {
  entry: LoginHistoryEntry
  number: number
  pageCount: number
}) {
  const [open, setOpen] = useState(false)
  const [pages, setPages] = useState<PageViewEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const isMember = Boolean(entry.user_id)

  async function toggle() {
    if (!open && pages === null) {
      setLoading(true)
      try {
        setPages(await fetchPageViews(entry.id))
      } finally {
        setLoading(false)
      }
    }
    setOpen((value) => !value)
  }

  return (
    <li className="flex flex-col gap-1.5 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-baseline md:justify-between md:gap-4">
        <p className="min-w-0 text-[15px] leading-snug">
          <span className="text-muted-foreground">No. {number}</span>
          <span className="mx-2 text-foreground/20">|</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              entry.event_type === "login" ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {entry.event_type === "login" ? "로그인" : "접속"}
          </span>
          <span className="mx-2 text-foreground/20">|</span>
          <span className="font-semibold text-foreground">{isMember ? (entry.email ?? "(이메일 없음)") : "비회원"}</span>
          {entry.provider ? (
            <>
              <span className="mx-2 text-foreground/20">|</span>
              <span>{entry.provider}</span>
            </>
          ) : null}
        </p>
        <p className="shrink-0 text-xs text-muted-foreground md:text-right">
          IP {entry.ip_address || "-"}
          {entry.ip_region ? (
            <>
              <span className="mx-1.5 text-foreground/20">|</span>
              {entry.ip_region}
            </>
          ) : null}
          <span className="mx-1.5 text-foreground/20">|</span>
          {formatBoardDateTime(entry.created_at)}
        </p>
      </div>
      {entry.user_agent || pageCount > 0 ? (
        <div className="flex items-center gap-3">
          {entry.user_agent ? (
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground/70" title={entry.user_agent}>
              {entry.user_agent}
            </p>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          {pageCount > 0 ? (
            <button
              type="button"
              onClick={toggle}
              className="flex shrink-0 items-center gap-1 rounded-full bg-foreground/[0.05] px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-foreground/[0.09] hover:text-foreground"
            >
              {loading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
              )}
              페이지 {pageCount}건
            </button>
          ) : null}
        </div>
      ) : null}

      {open && pages ? (
        <ul className="mt-1 space-y-1 rounded-lg bg-muted/40 p-2.5 text-xs">
          {pages.map((page) => (
            <li key={page.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate font-mono text-foreground/80">{page.path}</span>
              <span className="shrink-0 text-muted-foreground">{formatBoardDateTime(page.created_at)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

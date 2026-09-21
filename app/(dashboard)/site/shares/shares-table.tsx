"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { Check, Copy, History, LockKeyhole, Trash2, X } from "lucide-react"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"
import { useI18n } from "@/components/i18n/i18n-provider"
import { Button } from "@/components/ui/button"
import { showAlert, showConfirm } from "@/components/ui/layer-dialog"
import { lockDocumentScroll } from "@/lib/dom/lock-scroll"
import { formatBoardDateTime } from "@/lib/i18n/format"
import { adminLoadAccessLog, adminRemoveShareLink } from "@/lib/share/actions"
import { cn } from "@/lib/utils"
import type { AdminShareRow, ShareAccessEntry } from "@/types/share"

type Status = "active" | "expired" | "limited" | "deleted"
type Filter = "active" | "all"

function statusOf(row: AdminShareRow, now: number): Status {
  if (row.deletedAt) return "deleted"
  if (row.periodLimited && row.expiresAt && Date.parse(row.expiresAt) < now) return "expired"
  if (row.linkType === "public" && row.visitLimited && row.maxVisits !== null && row.visitCount >= row.maxVisits) {
    return "limited"
  }
  return "active"
}

const STATUS_TONE: Record<Status, string> = {
  active: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  expired: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  limited: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  deleted: "bg-muted text-muted-foreground",
}

export function SharesTable({ rows }: { rows: AdminShareRow[] }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>("active")
  const [copied, setCopied] = useState<string | null>(null)
  const [historyFor, setHistoryFor] = useState<AdminShareRow | null>(null)
  const [pending, setPending] = useState(false)
  const [now] = useState(() => Date.now())

  const decorated = useMemo(() => rows.map((row) => ({ row, status: statusOf(row, now) })), [rows, now])
  const visible = filter === "active" ? decorated.filter((item) => item.status !== "deleted") : decorated

  const stats = useMemo(() => {
    const live = decorated.filter((item) => item.status === "active")
    return {
      live: live.length,
      visits: decorated.reduce((sum, item) => sum + item.row.visitCount, 0),
      inviteRead: decorated.reduce((sum, item) => sum + item.row.inviteRead, 0),
      inviteTotal: decorated.reduce((sum, item) => sum + item.row.inviteTotal, 0),
    }
  }, [decorated])

  async function copyLink(row: AdminShareRow) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${row.key}`)
      setCopied(row.id)
      window.setTimeout(() => setCopied((current) => (current === row.id ? null : current)), 1500)
    } catch {
      await showAlert(t("share.copyFailed"))
    }
  }

  async function remove(row: AdminShareRow) {
    if (!(await showConfirm(t("share.admin.deleteConfirm", { title: row.title }), { destructive: true }))) return
    setPending(true)
    try {
      const result = await adminRemoveShareLink(row.id)
      if (!result.ok) await showAlert(t("share.error.failed"))
      else router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("share.admin.stat.live")} value={stats.live} />
        <Stat label={t("share.admin.stat.visits")} value={stats.visits} />
        <Stat label={t("share.admin.stat.inviteRead")} value={stats.inviteRead} />
        <Stat label={t("share.admin.stat.inviteTotal")} value={stats.inviteTotal} />
      </dl>

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">{t("share.admin.total", { count: visible.length })}</h2>
        <div className="inline-flex rounded-full bg-muted p-0.5 text-xs font-semibold">
          {(["active", "all"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full px-3 py-1.5 transition-colors",
                filter === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {value === "active" ? t("share.admin.filter.active") : t("share.admin.filter.all")}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyPlaceholder>{t("share.admin.empty")}</EmptyPlaceholder>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-card">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/60 text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{t("share.admin.col.target")}</th>
                <th className="px-3 py-3 font-semibold">{t("share.admin.col.type")}</th>
                <th className="px-3 py-3 font-semibold">{t("share.admin.col.creator")}</th>
                <th className="px-3 py-3 font-semibold">{t("share.admin.col.expires")}</th>
                <th className="px-3 py-3 text-right font-semibold">{t("share.admin.col.visits")}</th>
                <th className="px-3 py-3 font-semibold">{t("share.admin.col.status")}</th>
                <th className="px-3 py-3 font-semibold">{t("share.admin.col.created")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("share.admin.col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ row, status }) => (
                <tr key={row.id} className={cn("border-b last:border-b-0", status === "deleted" && "opacity-60")}>
                  <td className="max-w-[18rem] px-4 py-3">
                    <p className="flex items-center gap-1.5 truncate font-semibold">
                      <span className="truncate">{row.title}</span>
                      {row.hasPassword ? (
                        <LockKeyhole className="size-3.5 shrink-0 text-muted-foreground" aria-label={t("share.admin.password")} />
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {t(`share.admin.target.${row.targetType}`)}
                      {row.subPath ? ` · ${row.subPath}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    {row.linkType === "public" ? (
                      t("share.admin.type.public")
                    ) : (
                      <span>
                        {t("share.admin.type.invite")}
                        <span className="ml-1 text-xs tabular-nums text-muted-foreground">
                          ({row.inviteRead}/{row.inviteTotal})
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">{row.creatorName}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                    {row.periodLimited && row.expiresAt ? formatBoardDateTime(row.expiresAt, locale) : t("share.admin.unlimited")}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {row.visitCount}
                    {row.linkType === "public" && row.visitLimited && row.maxVisits ? (
                      <span className="text-xs text-muted-foreground"> / {row.maxVisits}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_TONE[status])}>
                      {t(`share.admin.status.${status}`)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-muted-foreground">
                    {formatBoardDateTime(row.createdAt, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {row.linkType === "public" && status !== "deleted" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => void copyLink(row)}
                          title={t("share.link.copy")}
                          aria-label={t("share.link.copy")}
                        >
                          {copied === row.id ? <Check /> : <Copy />}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setHistoryFor(row)}
                        title={t("share.admin.history")}
                        aria-label={t("share.admin.history")}
                      >
                        <History />
                      </Button>
                      {status !== "deleted" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          disabled={pending}
                          onClick={() => void remove(row)}
                          title={t("share.invite.delete")}
                          aria-label={t("share.invite.delete")}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historyFor ? <AccessHistoryDialog row={historyFor} onClose={() => setHistoryFor(null)} /> : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white px-4 py-4 dark:bg-card">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-2 font-display text-3xl font-extrabold tabular-nums">{value}</dd>
    </div>
  )
}

function AccessHistoryDialog({ row, onClose }: { row: AdminShareRow; onClose: () => void }) {
  const { t, locale } = useI18n()
  const [entries, setEntries] = useState<ShareAccessEntry[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void adminLoadAccessLog(row.id).then((result) => {
      if (cancelled) return
      if (result.ok) setEntries(result.entries)
      else setFailed(true)
    })
    return () => {
      cancelled = true
    }
  }, [row.id])

  useEffect(() => {
    const unlock = lockDocumentScroll()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      unlock()
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("share.admin.history")}
        className="relative flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border bg-background shadow-[0_30px_80px_-30px_hsl(24_20%_10%/0.6)] animate-in fade-in slide-in-from-bottom-6 duration-300 sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-3 border-b px-6 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-extrabold">{t("share.admin.history")}</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("share.close")}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {failed ? (
            <p className="py-8 text-center text-sm text-destructive">{t("share.error.failed")}</p>
          ) : entries === null ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("share.loading")}</p>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("share.admin.historyEmpty")}</p>
          ) : (
            <ul className="divide-y">
              {entries.map((entry) => (
                <li key={entry.id} className="py-3">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                    <span className="font-semibold">{entry.inviteName ?? t("share.admin.historyAnonymous")}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatBoardDateTime(entry.accessedAt, locale)}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {entry.ipAddress ?? "-"}
                    {entry.userAgent ? ` · ${entry.userAgent}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

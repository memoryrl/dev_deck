"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { BellRing, CheckCheck, RefreshCw, X } from "lucide-react"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"
import { useI18n } from "@/components/i18n/i18n-provider"
import { lockDocumentScroll } from "@/lib/dom/lock-scroll"
import { cn } from "@/lib/utils"
import type { NotificationItem } from "@/types/notification"
import { NOTIFICATION_STYLE, notificationBody, notificationTitle, relativeTime } from "./notification-format"

type Filter = "all" | "unread"

async function postRead(payload: { id: string } | { all: true }) {
  try {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch {
    // 다음 확인 주기에 서버 상태로 다시 맞춰진다
  }
}

export function NotificationPanel({
  open,
  onClose,
  unreadCount,
  onUnreadChange,
  changeTick,
}: {
  open: boolean
  onClose: () => void
  unreadCount: number
  onUnreadChange: (count: number) => void
  /** 값이 바뀌면(새 알림 도착 등) 열려 있는 목록을 다시 불러온다 */
  changeTick: number
}) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>("all")
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const requestId = useRef(0)

  const load = useCallback(
    async (silent = false) => {
      const current = ++requestId.current
      if (!silent) setLoading(true)
      try {
        const res = await fetch(`/api/notifications?filter=${filter}`, { cache: "no-store" })
        if (!res.ok) throw new Error("load_failed")
        const data = (await res.json()) as { items: NotificationItem[] }
        if (current !== requestId.current) return
        setItems(data.items)
        setFailed(false)
      } catch {
        if (current === requestId.current) setFailed(true)
      } finally {
        if (current === requestId.current) setLoading(false)
      }
    },
    [filter]
  )

  // 열릴 때, 필터를 바꿀 때 불러오고, 열려 있는 동안 새 알림이 오면 조용히 갱신한다.
  useEffect(() => {
    if (open) void load()
  }, [open, load])
  useEffect(() => {
    if (open && changeTick > 0) void load(true)
  }, [open, changeTick, load])

  useEffect(() => {
    if (!open) return
    const unlock = lockDocumentScroll()
    closeRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      unlock()
      document.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  function markRead(id: string) {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item)))
    void postRead({ id })
  }

  function handleSelect(item: NotificationItem) {
    if (!item.readAt) {
      markRead(item.id)
      onUnreadChange(Math.max(0, unreadCount - 1))
    }
    onClose()
    // 사이트 안의 경로만 연다. DB 값이 바뀌어도 외부 주소(https://…, //…, javascript:)로 이동하지 않게 한다.
    if (item.linkUrl && item.linkUrl.startsWith("/") && !item.linkUrl.startsWith("//")) router.push(item.linkUrl)
  }

  function handleMarkAll() {
    const now = new Date().toISOString()
    setItems((list) => list.map((item) => ({ ...item, readAt: item.readAt ?? now })))
    onUnreadChange(0)
    void postRead({ all: true })
  }

  if (!open) return null

  const visible = filter === "unread" ? items.filter((item) => !item.readAt) : items

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px] animate-in fade-in duration-200" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("notifications.panelAria")}
        className="absolute inset-y-0 right-0 flex w-[min(26rem,100vw)] flex-col border-l bg-background shadow-[-24px_0_60px_-30px_hsl(24_20%_10%/0.5)] animate-in slide-in-from-right duration-300"
      >
        <header className="relative border-b px-5 pb-4 pt-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,hsl(var(--lux-champagne)/0.32),transparent_55%)]"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
                <BellRing className="size-5 text-[hsl(var(--lux-cognac))]" aria-hidden />
                {t("notifications.title")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {unreadCount > 0 ? t("notifications.unreadCount", { count: unreadCount }) : t("notifications.allRead")}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t("notifications.close")}
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="relative mt-4 flex items-center justify-between gap-2">
            <div className="inline-flex rounded-full bg-muted p-0.5 text-xs font-semibold">
              {(["all", "unread"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={cn(
                    "rounded-full px-3 py-1.5 transition-colors",
                    filter === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {value === "all" ? t("notifications.filterAll") : t("notifications.filterUnread")}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                aria-label={t("notifications.refresh")}
                title={t("notifications.refresh")}
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden />
              </button>
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={unreadCount === 0}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <CheckCheck className="size-3.5" aria-hidden />
                {t("notifications.markAllRead")}
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {failed && items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("notifications.loadFailed")}</p>
          ) : loading && items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("notifications.loading")}</p>
          ) : visible.length === 0 ? (
            <EmptyPlaceholder className="min-h-56" icon={BellRing}>
              {filter === "unread" ? t("notifications.emptyUnread") : t("notifications.empty")}
            </EmptyPlaceholder>
          ) : (
            <ul className="space-y-2">
              {visible.map((item) => {
                const unread = !item.readAt
                const { icon: Icon, tone } = NOTIFICATION_STYLE[item.type]
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "group relative flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors",
                        unread
                          ? "border-[hsl(var(--lux-champagne)/0.55)] bg-[hsl(var(--lux-champagne)/0.14)] hover:bg-[hsl(var(--lux-champagne)/0.22)]"
                          : "bg-card hover:bg-foreground/[0.03]"
                      )}
                    >
                      <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full", tone, !unread && "opacity-70")}>
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={cn("truncate text-sm", unread ? "font-bold" : "font-semibold text-foreground/80")}>
                            {notificationTitle(item, t)}
                          </span>
                          {unread ? (
                            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[hsl(var(--lux-cognac))]" />
                          ) : null}
                        </span>
                        <span className={cn("mt-0.5 line-clamp-2 block text-[13px] leading-relaxed", unread ? "text-foreground/85" : "text-muted-foreground")}>
                          {notificationBody(item, t)}
                        </span>
                        <span className="mt-1.5 block text-[11px] tabular-nums text-muted-foreground">
                          {relativeTime(item.createdAt, t, locale)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>,
    document.body
  )
}

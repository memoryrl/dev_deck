"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Bell, X } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { NOTIFICATION_TOAST_MS } from "@/lib/notifications/config"
import { cn } from "@/lib/utils"
import type { NotificationItem } from "@/types/notification"
import { NOTIFICATION_STYLE, notificationBody, notificationTitle } from "./notification-format"

export function NotificationToast({
  item,
  count,
  onOpen,
  onClose,
}: {
  item: NotificationItem
  /** 이번에 새로 도착한 알림 수 */
  count: number
  onOpen: () => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const [hovered, setHovered] = useState(false)
  const { icon: Icon, tone } = NOTIFICATION_STYLE[item.type]

  // 마우스를 올려 두는 동안은 사라지지 않는다.
  useEffect(() => {
    if (hovered) return
    const timer = window.setTimeout(onClose, NOTIFICATION_TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [hovered, item.id, onClose])

  // 헤더의 backdrop-blur가 fixed 기준점을 헤더로 바꿔 버리므로 body로 띄운다.
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-[4.5rem] z-[95] w-[min(22rem,calc(100vw-2rem))] animate-in fade-in slide-in-from-top-4 duration-300"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-[0_18px_44px_-20px_hsl(24_20%_10%/0.55)] ring-1 ring-[hsl(var(--lux-cognac)/0.2)]">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[hsl(var(--lux-cognac))]" />
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-start gap-3 py-3.5 pl-5 pr-10 text-left transition-colors hover:bg-foreground/[0.03]"
        >
          <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full", tone)}>
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Bell className="size-3" aria-hidden />
              {count > 1 ? t("notifications.toastCount", { count }) : t("notifications.toastDefault")}
            </span>
            <span className="mt-1 block truncate text-sm font-bold">{notificationTitle(item, t)}</span>
            <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
              {notificationBody(item, t)}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("notifications.toastClose")}
          className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>,
    document.body
  )
}

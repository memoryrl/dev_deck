"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bell } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"
import type { NotificationItem } from "@/types/notification"
import { NotificationPanel } from "./notification-panel"
import { NotificationToast } from "./notification-toast"
import { useNotificationPolling } from "./use-notification-polling"

/**
 * 헤더의 알림 종 + 새 알림 토스트 + 알림 패널.
 * 로그인한 사용자에게만 렌더링한다(호출하는 쪽에서 account가 있을 때만 둔다).
 * userKey는 "어디까지 봤는지" 기준선을 사용자별로 나누는 데 쓴다.
 */
export function NotificationCenter({ userKey, className }: { userKey: string; className?: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<{ item: NotificationItem; count: number } | null>(null)
  const openRef = useRef(open)

  useEffect(() => {
    openRef.current = open
  }, [open])

  // 패널이 열려 있으면 목록이 바로 갱신되므로 토스트는 띄우지 않는다.
  const handleNew = useCallback((item: NotificationItem, count: number) => {
    if (!openRef.current) setToast({ item, count })
  }, [])

  const { unreadCount, setUnreadCount, changeTick } = useNotificationPolling(userKey, handleNew)
  const closeToast = useCallback(() => setToast(null), [])

  const label = unreadCount > 0 ? t("notifications.bellAriaUnread", { count: unreadCount }) : t("notifications.bellAria")

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setToast(null)
          setOpen(true)
        }}
        aria-label={label}
        aria-haspopup="dialog"
        className={cn(
          "relative inline-flex size-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-foreground/[0.06] hover:text-foreground",
          className
        )}
      >
        <Bell className="size-[1.15rem]" aria-hidden />
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[hsl(var(--lux-cognac))] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {toast ? (
        <NotificationToast
          item={toast.item}
          count={toast.count}
          onClose={closeToast}
          onOpen={() => {
            setToast(null)
            setOpen(true)
          }}
        />
      ) : null}

      <NotificationPanel
        open={open}
        onClose={() => setOpen(false)}
        unreadCount={unreadCount}
        onUnreadChange={setUnreadCount}
        changeTick={changeTick}
      />
    </>
  )
}

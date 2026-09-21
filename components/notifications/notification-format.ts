import { FilePlus2, MessageSquare, UserMinus, UserPlus, type LucideIcon } from "lucide-react"
import { formatBoardDateTime } from "@/lib/i18n/format"
import type { AppLocale } from "@/lib/i18n/config"
import type { NotificationItem, NotificationType } from "@/types/notification"

type T = (key: string, vars?: Record<string, string | number>) => string

// 종류별 아이콘·색. 색은 사이트 팔레트(--lux-*)와 상태색만 쓴다.
export const NOTIFICATION_STYLE: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  member_signup: { icon: UserPlus, tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" },
  member_withdraw: { icon: UserMinus, tone: "bg-destructive/10 text-destructive" },
  post_created_admin: {
    icon: FilePlus2,
    tone: "bg-[hsl(var(--lux-champagne)/0.28)] text-[hsl(var(--lux-cognac))] dark:text-[hsl(var(--lux-champagne))]",
  },
  post_created_author: {
    icon: FilePlus2,
    tone: "bg-[hsl(var(--lux-champagne)/0.28)] text-[hsl(var(--lux-cognac))] dark:text-[hsl(var(--lux-champagne))]",
  },
  post_reply: { icon: MessageSquare, tone: "bg-sky-500/12 text-sky-700 dark:text-sky-400" },
}

export function notificationTitle(item: NotificationItem, t: T) {
  return t(`notifications.type.${item.type}.title`)
}

export function notificationBody(item: NotificationItem, t: T) {
  return t(`notifications.type.${item.type}.body`, {
    actor: item.actorName || t("notifications.someone"),
    subject: item.subject ?? "",
  })
}

export function relativeTime(iso: string, t: T, locale: AppLocale, now = Date.now()) {
  const diff = Math.max(0, now - Date.parse(iso))
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return t("notifications.timeNow")
  if (minutes < 60) return t("notifications.timeMinutes", { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t("notifications.timeHours", { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return t("notifications.timeDays", { count: days })
  return formatBoardDateTime(iso, locale)
}

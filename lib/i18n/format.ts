import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/config"
import { t, type Messages } from "@/lib/i18n/t"

const WEEKDAYS: Record<AppLocale, string[]> = {
  ko: ["일", "월", "화", "수", "목", "금", "토"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
}

export function formatBoardDateTime(
  iso: string | null | undefined,
  locale: AppLocale = DEFAULT_LOCALE
) {
  if (!iso) return "-"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")
  const weekday = WEEKDAYS[locale][date.getDay()]
  return `${year}-${month}-${day} (${weekday}) ${hours}:${minutes}:${seconds}`
}

export function formatLastPlayed(iso: string | null, messages: Messages) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return t(messages, "steam.today")
  if (days === 1) return t(messages, "steam.yesterday")
  if (days < 7) return t(messages, "steam.daysAgo", { count: days })
  if (days < 30) return t(messages, "steam.weeksAgo", { count: Math.floor(days / 7) })
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}.${month}.${day}`
}

export function formatPeriod(
  start: string | null,
  end: string | null,
  presentLabel: string
) {
  if (!start && !end) return null
  const from = start ? start.slice(0, 7).replace("-", ".") : ""
  const to = end ? end.slice(0, 7).replace("-", ".") : presentLabel
  return `${from} – ${to}`
}

export function dateLocaleTag(locale: AppLocale) {
  return locale === "en" ? "en-US" : "ko-KR"
}

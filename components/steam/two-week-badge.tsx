"use client"

import { useI18n } from "@/components/i18n/i18n-provider"
import { cn, formatPlaytime } from "@/lib/utils"

export function TwoWeekBadge({
  minutes,
  className,
}: {
  minutes: number | null | undefined
  className?: string
}) {
  const { t } = useI18n()
  if (!minutes) return null
  return (
    <span
      className={cn(
        "absolute right-2.5 top-2.5 z-10 rounded-md bg-background/85 px-2 py-0.5 text-xs font-semibold tabular-nums backdrop-blur-sm",
        className
      )}
    >
      {t("steam.twoWeeks", { time: formatPlaytime(minutes) })}
    </span>
  )
}

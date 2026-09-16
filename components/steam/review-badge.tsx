"use client"

import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

export function WrittenReviewBadge({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <span
      className={cn(
        "absolute bottom-2.5 right-2.5 z-10 rounded-md bg-background/85 px-2 py-0.5 text-xs font-semibold backdrop-blur-sm",
        className
      )}
    >
      {t("steam.writtenReview")}
    </span>
  )
}

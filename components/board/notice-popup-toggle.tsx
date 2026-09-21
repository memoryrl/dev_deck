"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { setNoticePopup } from "@/app/(public)/b/actions"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

export function NoticePopupToggle({
  postId,
  enabled,
  className,
}: {
  postId: string
  enabled: boolean
  className?: string
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [on, setOn] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle(next: boolean) {
    const prev = on
    setOn(next)
    setError(null)
    startTransition(async () => {
      const result = await setNoticePopup(postId, next)
      if (!result.ok) {
        setOn(prev)
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <div className="flex items-center gap-2">
        <Switch checked={on} disabled={pending} onCheckedChange={toggle} aria-label={t("noticePopup.toggle")} />
        <Label className="text-sm font-medium">{t("noticePopup.toggle")}</Label>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/i18n/i18n-provider"
import { persistNoticePopupDismissed } from "@/lib/boards/notice-popup-window"
import { cn } from "@/lib/utils"

export function NoticePopupChrome({
  postId,
  label,
  children,
  onClose,
  onReadMore,
}: {
  postId: string
  label: string
  children: ReactNode
  onClose: () => void
  onReadMore: () => void
}) {
  const { t } = useI18n()
  const skipId = useId()
  const [skip, setSkip] = useState(false)
  const skipRef = useRef(false)

  useEffect(() => {
    skipRef.current = skip
  }, [skip])

  useEffect(() => {
    function persistIfNeeded() {
      if (!skipRef.current) return
      persistNoticePopupDismissed(postId)
    }
    window.addEventListener("pagehide", persistIfNeeded)
    return () => window.removeEventListener("pagehide", persistIfNeeded)
  }, [postId])

  function persistIfSkipped() {
    if (!skipRef.current) return
    persistNoticePopupDismissed(postId)
  }

  function close() {
    persistIfSkipped()
    onClose()
  }

  function readMore() {
    persistIfSkipped()
    onReadMore()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-5">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <Button type="button" size="sm" className="shrink-0" onClick={readMore}>
          {t("noticePopup.read")}
        </Button>
      </div>
      {children}
      <div className="mt-auto flex items-center gap-3 border-t border-foreground/10 pt-3">
        <label htmlFor={skipId} className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
          <input
            id={skipId}
            type="checkbox"
            checked={skip}
            onChange={(event) => setSkip(event.target.checked)}
            className={cn(
              "mt-0.5 size-4 shrink-0 cursor-pointer rounded-sm border border-foreground/25 accent-foreground"
            )}
          />
          <span className="min-w-0 text-xs leading-snug text-muted-foreground">
            <span className="font-medium text-foreground">{t("noticePopup.dontShow")}</span>
            <span className="mt-0.5 block">{t("noticePopup.dontShowHint")}</span>
          </span>
        </label>
        <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={close}>
          {t("noticePopup.close")}
        </Button>
      </div>
    </div>
  )
}

export function NoticePopupWindowChrome({
  postId,
  href,
  label,
  children,
}: {
  postId: string
  href: string
  label: string
  children: ReactNode
}) {
  function closeWindow() {
    window.close()
  }

  function readMore() {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.location.href = href
        window.opener.focus()
        window.close()
        return
      }
    } catch {
      // opener가 다른 origin이면 이 창에서 연다
    }
    window.location.href = href
  }

  return (
    <NoticePopupChrome postId={postId} label={label} onClose={closeWindow} onReadMore={readMore}>
      {children}
    </NoticePopupChrome>
  )
}

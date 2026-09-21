"use client"

import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import { RichContent } from "@/components/editor/rich-content"
import { NoticePopupChrome } from "@/components/layout/notice-popup-window-actions"
import { lockDocumentScroll } from "@/lib/dom/lock-scroll"
import {
  NOTICE_POPUP_PATH,
  NOTICE_POPUP_WINDOW_NAME,
  markNoticePopupOpened,
  noticePopupClosedThisVisit,
  noticePopupFeatures,
  readNoticePopupDismissedId,
  type NoticePopupMode,
  type NoticePopupView,
} from "@/lib/boards/notice-popup-window"
import { useI18n } from "@/components/i18n/i18n-provider"

export function NoticePopupLauncher({
  post,
  mode,
  label,
}: {
  post: NoticePopupView
  mode: NoticePopupMode
  label: string
}) {
  const pathname = usePathname()
  const [layerOpen, setLayerOpen] = useState(false)

  useEffect(() => {
    if (pathname.startsWith("/login") || pathname.startsWith("/auth") || pathname.startsWith(NOTICE_POPUP_PATH)) {
      setLayerOpen(false)
      return
    }
    if (window.name === NOTICE_POPUP_WINDOW_NAME) return
    if (readNoticePopupDismissedId() === post.id || noticePopupClosedThisVisit(post.id)) return

    if (mode === "layer") {
      markNoticePopupOpened(post.id)
      setLayerOpen(true)
      return
    }

    function openNotice() {
      const popup = window.open(NOTICE_POPUP_PATH, NOTICE_POPUP_WINDOW_NAME, noticePopupFeatures())
      if (!popup) return false
      markNoticePopupOpened(post.id)
      popup.focus()
      return true
    }

    if (openNotice()) return

    function onGesture() {
      if (openNotice()) window.removeEventListener("pointerdown", onGesture)
    }
    window.addEventListener("pointerdown", onGesture)
    return () => window.removeEventListener("pointerdown", onGesture)
  }, [pathname, post.id, mode])

  if (mode !== "layer" || !layerOpen) return null

  return <NoticePopupLayer post={post} label={label} onClose={() => setLayerOpen(false)} />
}

function NoticePopupLayer({
  post,
  label,
  onClose,
}: {
  post: NoticePopupView
  label: string
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <NoticePopupLayerDialog post={post} label={label} onClose={onClose} />,
    document.body
  )
}

function NoticePopupLayerDialog({
  post,
  label,
  onClose,
}: {
  post: NoticePopupView
  label: string
  onClose: () => void
}) {
  const { t } = useI18n()
  const router = useRouter()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closed = useRef(false)

  function close() {
    if (closed.current) return
    closed.current = true
    onClose()
  }

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const unlock = lockDocumentScroll()
    const panel = panelRef.current
    const buttons = panel ? Array.from(panel.querySelectorAll<HTMLElement>("button")) : []
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    first?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        close()
        return
      }
      if (event.key !== "Tab" || !first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKey, true)
    return () => {
      unlock()
      document.removeEventListener("keydown", onKey, true)
      previous?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label={t("noticePopup.close")}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
        onClick={close}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(35rem,calc(100dvh-2rem))] w-full max-w-[26rem] flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-background shadow-[0_24px_48px_-20px_hsl(var(--foreground)/0.55)]"
      >
        <NoticePopupChrome
          postId={post.id}
          label={label}
          onClose={close}
          onReadMore={() => {
            close()
            router.push(post.href)
          }}
        >
          {/* 페이지 본문이 이미 h1을 가지므로 팝업 제목은 h2 — 문서에 h1이 두 개가 되지 않게 한다 */}
          <h2 id={titleId} className="mt-1.5 font-display text-lg font-bold leading-snug">
            {post.title}
          </h2>
          {/* 긴 공지는 이 영역만 스크롤된다 — 키보드로도 스크롤할 수 있도록 포커스를 받게 한다 */}
          <div
            tabIndex={0}
            role="region"
            aria-labelledby={titleId}
            className="mt-4 min-h-0 flex-1 overflow-y-auto text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {post.content ? (
              <RichContent content={post.content} />
            ) : post.excerpt ? (
              <p className="leading-relaxed text-muted-foreground">{post.excerpt}</p>
            ) : null}
          </div>
        </NoticePopupChrome>
      </div>
    </div>
  )
}

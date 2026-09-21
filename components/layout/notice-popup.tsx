"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import {
  NOTICE_POPUP_DISMISSED_KEY,
  NOTICE_POPUP_PATH,
  NOTICE_POPUP_SESSION_KEY,
  NOTICE_POPUP_WINDOW_NAME,
  noticePopupFeatures,
} from "@/lib/boards/notice-popup-window"

function dismissedId() {
  try {
    return window.localStorage.getItem(NOTICE_POPUP_DISMISSED_KEY)
  } catch {
    return null
  }
}

function closedThisVisit(id: string) {
  try {
    return window.sessionStorage.getItem(NOTICE_POPUP_SESSION_KEY) === id
  } catch {
    return false
  }
}

function markOpened(id: string) {
  try {
    window.sessionStorage.setItem(NOTICE_POPUP_SESSION_KEY, id)
  } catch {
    // ignore
  }
}

export function NoticePopupLauncher({ postId }: { postId: string }) {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname.startsWith("/login") || pathname.startsWith("/auth") || pathname.startsWith(NOTICE_POPUP_PATH)) {
      return
    }
    if (window.name === NOTICE_POPUP_WINDOW_NAME) return
    if (dismissedId() === postId || closedThisVisit(postId)) return

    function openNotice() {
      const popup = window.open(NOTICE_POPUP_PATH, NOTICE_POPUP_WINDOW_NAME, noticePopupFeatures())
      if (!popup) return false
      markOpened(postId)
      popup.focus()
      return true
    }

    if (openNotice()) return

    function onGesture() {
      if (openNotice()) window.removeEventListener("pointerdown", onGesture)
    }
    window.addEventListener("pointerdown", onGesture)
    return () => window.removeEventListener("pointerdown", onGesture)
  }, [pathname, postId])

  return null
}

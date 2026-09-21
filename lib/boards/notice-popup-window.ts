export const NOTICE_POPUP_PATH = "/notice-popup"
export const NOTICE_POPUP_WINDOW_NAME = "devdeck-notice"
export const NOTICE_POPUP_DISMISSED_KEY = "devdeck:notice-popup-dismissed"
export const NOTICE_POPUP_SESSION_KEY = "devdeck:notice-popup-closed"
export const NOTICE_POPUP_MODES = ["layer", "window"] as const
export type NoticePopupMode = (typeof NOTICE_POPUP_MODES)[number]
export const DEFAULT_NOTICE_POPUP_MODE: NoticePopupMode = "layer"

export type NoticePopupView = {
  id: string
  title: string
  excerpt: string
  content: string
  href: string
}

export function parseNoticePopupMode(raw: string | null | undefined): NoticePopupMode {
  return raw === "window" ? "window" : "layer"
}

export function readNoticePopupDismissedId(): string | null {
  try {
    return window.localStorage.getItem(NOTICE_POPUP_DISMISSED_KEY)
  } catch {
    return null
  }
}

export function noticePopupClosedThisVisit(id: string) {
  try {
    return window.sessionStorage.getItem(NOTICE_POPUP_SESSION_KEY) === id
  } catch {
    return false
  }
}

export function markNoticePopupOpened(id: string) {
  try {
    window.sessionStorage.setItem(NOTICE_POPUP_SESSION_KEY, id)
  } catch {
    // ignore
  }
}

export function persistNoticePopupDismissed(id: string) {
  try {
    window.localStorage.setItem(NOTICE_POPUP_DISMISSED_KEY, id)
  } catch {
    // ignore
  }
}

export function noticePopupFeatures() {
  const width = 420
  const height = 560
  const availWidth = window.screen.availWidth || window.screen.width
  const left = Math.max(24, availWidth - width - 36)
  const top = 72
  return [
    "popup=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "scrollbars=yes",
    "resizable=yes",
    "menubar=no",
    "toolbar=no",
    "location=no",
    "status=no",
  ].join(",")
}

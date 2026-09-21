export const NOTICE_POPUP_PATH = "/notice-popup"
export const NOTICE_POPUP_WINDOW_NAME = "devdeck-notice"
export const NOTICE_POPUP_DISMISSED_KEY = "devdeck:notice-popup-dismissed"
export const NOTICE_POPUP_SESSION_KEY = "devdeck:notice-popup-closed"

export function noticePopupFeatures() {
  const width = 420
  const height = 560
  const availLeft = window.screen.availLeft ?? 0
  const availTop = window.screen.availTop ?? 0
  const availWidth = window.screen.availWidth || window.screen.width
  const left = Math.max(availLeft + 24, availLeft + availWidth - width - 36)
  const top = availTop + 72
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

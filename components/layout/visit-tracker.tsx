"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { VISIT_ID_COOKIE, VISIT_WINDOW_MS } from "@/lib/auth/visit-window"

const STORAGE_KEY = "dd_visit_logged"
let sessionStarting = false

function alreadyLoggedThisTab() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const at = Number(raw)
    return Number.isFinite(at) && Date.now() - at < VISIT_WINDOW_MS
  } catch {
    return false
  }
}

function markLoggedThisTab() {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    // sessionStorage를 쓸 수 없어도 서버 쿠키 가드가 한 번 더 막는다
  }
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function sendPageView(path: string) {
  const body = JSON.stringify({ path })
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/track-pageview", new Blob([body], { type: "application/json" }))
  } else {
    fetch("/api/track-pageview", { method: "POST", body, keepalive: true }).catch(() => {})
  }
}

// 최초 로드는 /api/track-visit이 세션(login_history 행)을 만들거나 재사용하면서
// 그 경로를 첫 페이지뷰로 같이 남긴다. 이후 App Router 클라이언트 라우팅으로 경로가
// 바뀔 때마다(레이아웃 재마운트 없이) sendBeacon으로 가벼운 페이지뷰 한 줄만 보낸다
// — 지역 조회 없음, 렌더링을 막지 않음(docs/10-login-history.md 3.1절).
export function VisitTracker() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (lastPath.current === pathname) return
    const isFirst = lastPath.current === null
    lastPath.current = pathname

    if (isFirst) {
      if (sessionStarting || alreadyLoggedThisTab()) return
      sessionStarting = true
      markLoggedThisTab()
      fetch("/api/track-visit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
      }).catch(() => {
        // 접속 기록 실패는 화면에 아무 영향도 주지 않는다
      })
      return
    }

    if (readCookie(VISIT_ID_COOKIE)) sendPageView(pathname)
  }, [pathname])

  return null
}

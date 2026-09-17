"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { VISIT_WINDOW_MS } from "@/lib/auth/visit-window"

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

    // dd_visit_id는 httpOnly라 여기서 값을 확인할 수 없다 — 그냥 보내면
    // 서버(/api/track-pageview)가 쿠키 유무를 스스로 확인해 없으면 조용히
    // 무시한다(세션이 아직 없는 첫 렌더 타이밍 등).
    sendPageView(pathname)
  }, [pathname])

  return null
}

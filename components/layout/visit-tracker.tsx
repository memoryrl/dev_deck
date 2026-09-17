"use client"

import { useEffect } from "react"
import { VISIT_WINDOW_MS } from "@/lib/auth/visit-window"

const STORAGE_KEY = "dd_visit_logged"
let inFlight = false

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

// 페이지가 처음 로드될 때 한 번 /api/track-visit을 찔러 접속을 기록한다. App Router는
// 내부 네비게이션에서 루트 레이아웃을 다시 마운트하지 않으므로 이 useEffect는
// 새로고침마다 다시 돈다. React Strict Mode·테마 프로바이더 리마운트에서 두 번
// 나가지 않게 모듈 플래그와 sessionStorage로 먼저 막고, 서버에서도 쿠키와
// 최근 이력으로 한 번 더 막는다(app/api/track-visit/route.ts).
export function VisitTracker() {
  useEffect(() => {
    if (inFlight || alreadyLoggedThisTab()) return
    inFlight = true
    markLoggedThisTab()
    fetch("/api/track-visit", { method: "POST", keepalive: true }).catch(() => {
      // 접속 기록 실패는 화면에 아무 영향도 주지 않는다
    })
  }, [])

  return null
}

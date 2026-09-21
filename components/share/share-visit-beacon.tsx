"use client"

import { useEffect } from "react"
import { recordShareVisit } from "@/lib/share/actions"

// 개발 모드의 StrictMode가 effect를 두 번 실행해도 방문이 두 번 세어지지 않게 한다.
const reported = new Set<string>()

/** 공유 화면이 실제로 열렸을 때 접속 이력과 방문 수를 남긴다(서버 액션). */
export function ShareVisitBeacon({ shareKey }: { shareKey: string }) {
  useEffect(() => {
    if (reported.has(shareKey)) return
    reported.add(shareKey)
    void recordShareVisit(shareKey).catch(() => {
      reported.delete(shareKey)
    })
  }, [shareKey])

  return null
}

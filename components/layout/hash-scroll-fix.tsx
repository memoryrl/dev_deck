"use client"

import { useEffect } from "react"

function scrollToHash() {
  const hash = window.location.hash
  if (!hash) return false
  const el = document.getElementById(decodeURIComponent(hash.slice(1)))
  if (!el) return false
  el.scrollIntoView({ behavior: "smooth", block: "start" })
  return true
}

// 랜딩 섹션(#prompts, #career, #skills 등)은 Suspense로 스트리밍되어 첫 페인트
// 시점엔 아직 DOM에 없을 수 있다 — 브라우저의 기본 해시 스크롤은 그 순간 한 번만
// 시도하고 끝이라 타겟을 못 찾으면 그냥 포기한다("랜딩페이지 일부만 보이는" 원인).
// 여기서는 타겟이 나타날 때까지 MutationObserver로 지켜보다가 나타나면 스크롤한다.
// 이미 홈에 있는 상태에서 해시만 바뀌는 경우(페이지 이동이 없어 컴포넌트가
// 리마운트되지 않는 경우)를 위해 hashchange도 같이 듣는다.
export function HashScrollFix() {
  useEffect(() => {
    let observer: MutationObserver | null = null
    let timeout: number | null = null

    function stop() {
      observer?.disconnect()
      observer = null
      if (timeout != null) window.clearTimeout(timeout)
      timeout = null
    }

    function attempt() {
      stop()
      if (scrollToHash()) return

      observer = new MutationObserver(() => {
        if (scrollToHash()) stop()
      })
      observer.observe(document.body, { childList: true, subtree: true })
      // 5초 넘게 타겟이 안 나타나면(잘못된 해시 등) 관찰을 그만둔다.
      timeout = window.setTimeout(stop, 5000)
    }

    attempt()
    window.addEventListener("hashchange", attempt)
    return () => {
      stop()
      window.removeEventListener("hashchange", attempt)
    }
  }, [])

  return null
}

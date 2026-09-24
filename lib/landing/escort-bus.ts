"use client"

import type { MouseEvent as ReactMouseEvent } from "react"
import type { TopologyModuleNode } from "@/lib/landing/topology-modules"

// 헤더·푸터 내비게이션과 랜딩 토폴로지 패널을 잇는 아주 작은 버스.
// 토폴로지 패널이 화면에 보이는 동안 핸들러를 등록해 두면, 사이트 어디의 메뉴 링크든
// 클릭 시 "로봇이 문으로 안내하고 나가는" 연출을 거쳐 이동한다. 패널이 없거나(다른 페이지,
// 클래식 슬라이드) 연출을 맡을 로봇이 없으면 false를 돌려 링크 기본 동작으로 이동한다.

export type EscortRequest = {
  href: string
  label: string
  /** 헤더 루트 메뉴 id(= 토폴로지 모듈 id). 알 수 없으면 href로 책상을 찾는다 */
  menuId?: string | null
  /** 링크가 속한 묶음 제목(푸터 컬럼 등) — href로 못 찾을 때 책상 라벨과 맞춰 본다 */
  groupLabel?: string | null
  /**
   * 메뉴가 아닌 일반 링크(본문 카드, 버튼형 링크 등)에서 온 요청. 이 화면을 맡는 로봇이
   * 분명할 때만 안내하고, 못 찾으면 "첫 번째 로봇"으로 대신하지 않는다 → 연출 없이 이동.
   */
  strict?: boolean
}

type EscortHandler = (request: EscortRequest) => boolean

// primary: 랜딩 히어로의 토폴로지 패널(화면에 보일 때만 등록). fallback: 공개 셸 어디에나
// 떠 있는 전체 화면 오버레이(escort-overlay.tsx) — 패널이 없거나 연출을 사양하면 대신 맡아
// 토폴로지 방만 잠깐 띄우고 로봇이 안내한 뒤 이동한다.
let primary: EscortHandler | null = null
let fallback: EscortHandler | null = null

export function registerEscortHandler(next: EscortHandler, options?: { fallback?: boolean }) {
  if (options?.fallback) {
    fallback = next
    return () => {
      if (fallback === next) fallback = null
    }
  }
  primary = next
  return () => {
    if (primary === next) primary = null
  }
}

export function requestEscort(request: EscortRequest): boolean {
  if (primary?.(request)) return true
  return fallback ? fallback(request) : false
}

export function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  } catch {
    return false
  }
}

export function isExternalHref(href: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")
}

// 새 탭·수식키 클릭·이미 처리된 이벤트는 브라우저 기본 동작(새 탭 등)에 맡긴다
export function isPlainLeftClick(event: ReactMouseEvent<HTMLElement>) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

/**
 * 내비게이션 링크 onClick에서 호출한다. 연출을 맡을 패널이 있으면 기본 이동을 막고
 * 연출 뒤 이동하게 하고, 없으면 아무것도 하지 않아 Link가 평소처럼 이동한다.
 * 해시 앵커·외부 링크·현재 페이지(랜딩) 링크는 연출 대상이 아니다.
 */
export function escortLinkClick(event: ReactMouseEvent<HTMLElement>, request: EscortRequest) {
  if (!isPlainLeftClick(event)) return
  if (prefersReducedMotion()) return
  if (isExternalHref(request.href) || request.href.includes("#") || request.href === "/") return
  if (requestEscort(request)) event.preventDefault()
}

function pathOf(href: string) {
  return href.split(/[?#]/)[0] || "/"
}

function prefixScore(target: string, candidate: string | null | undefined) {
  if (!candidate) return -1
  const path = pathOf(candidate)
  if (path === "/") return -1
  if (target === path) return path.length + 1
  if (target.startsWith(`${path}/`)) return path.length
  return -1
}

/**
 * 링크 하나를 어느 책상(로봇)이 안내할지 정한다.
 * 1) 메뉴 id 일치 → 2) href 완전 일치 → 3) 모듈·하위 항목 경로가 가장 길게 일치 → 4) 라벨 일치 → 5) 첫 번째 재석 로봇.
 * 외근(vacant) 좌석은 로봇이 없으므로 제외한다.
 */
export function resolveEscortModule(
  modules: TopologyModuleNode[],
  request: EscortRequest
): TopologyModuleNode | null {
  const seated = modules.filter((module) => !module.vacant)
  if (seated.length === 0) return null

  if (request.menuId) {
    const byId = seated.find((module) => module.id === request.menuId)
    if (byId) return byId
  }

  // 쿼리까지 똑같은 링크가 있으면 그 책상 — 경로가 같고 쿼리만 다른 링크들이 섞이지 않게
  const exact = seated.find(
    (module) => module.href === request.href || module.items.some((item) => item.href === request.href)
  )
  if (exact) return exact

  const target = pathOf(request.href)
  let best: TopologyModuleNode | null = null
  let bestScore = -1
  for (const node of seated) {
    const score = Math.max(prefixScore(target, node.href), ...node.items.map((item) => prefixScore(target, item.href)))
    if (score > bestScore) {
      bestScore = score
      best = node
    }
  }
  if (best && bestScore >= 0) return best

  const byLabel = seated.find(
    (module) => module.label === request.groupLabel || module.label === request.label
  )
  if (byLabel) return byLabel
  return request.strict ? null : seated[0]
}

/**
 * 말풍선에 넣을 목적지 이름. 일반 링크는 본문 텍스트가 길거나(카드 제목) 비어 있을 수
 * 있어(아이콘 링크), 토폴로지 데이터에 있는 메뉴·하위 항목 라벨을 우선 쓴다.
 */
export function escortTargetLabel(node: TopologyModuleNode, href: string, fallback?: string | null) {
  const exact = node.items.find((item) => item.href === href)
  if (exact) return exact.label
  if (node.href === href) return node.label
  const path = pathOf(href)
  const byPath = node.items.find((item) => pathOf(item.href) === path)
  if (byPath) return byPath.label
  if (pathOf(node.href) === path) return node.label
  const text = fallback?.replace(/\s+/g, " ").trim()
  if (text && text.length <= 32) return text
  return node.label
}

/**
 * 메뉴 외의 모든 내부 링크 클릭을 한 곳에서 가로채는 document 캡처 리스너.
 * Next Link는 자기 onClick에서 defaultPrevented면 이동을 건너뛰므로, 그보다 먼저(캡처)
 * preventDefault 해야 연출 뒤 이동으로 바꿀 수 있다. 헤더·푸터·토폴로지 패널처럼 스스로
 * 연출을 요청하는 영역은 data-escort-handled로 표시해 두 번 처리하지 않는다.
 * 같은 경로 안의 이동(페이지네이션·필터·탭)과 새 탭·다운로드·외부 링크는 건드리지 않는다.
 */
export function escortAnyLinkClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
  if (!anchor || anchor.closest("[data-escort-handled]")) return
  if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return
  const raw = anchor.getAttribute("href") ?? ""
  if (!raw || raw.startsWith("#") || isExternalHref(raw)) return
  let url: URL
  try {
    url = new URL(anchor.href, window.location.href)
  } catch {
    return
  }
  if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
  if (prefersReducedMotion()) return
  const label = anchor.getAttribute("aria-label") ?? anchor.textContent ?? ""
  if (requestEscort({ href: `${url.pathname}${url.search}`, label, strict: true })) event.preventDefault()
}

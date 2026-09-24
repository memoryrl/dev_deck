"use client"

import type { MouseEvent as ReactMouseEvent } from "react"
import type { TopologyModuleNode } from "@/lib/landing/topology"

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
}

type EscortHandler = (request: EscortRequest) => boolean

let handler: EscortHandler | null = null

export function registerEscortHandler(next: EscortHandler) {
  handler = next
  return () => {
    if (handler === next) handler = null
  }
}

export function requestEscort(request: EscortRequest): boolean {
  return handler ? handler(request) : false
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
  return byLabel ?? seated[0]
}

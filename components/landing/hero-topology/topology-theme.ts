"use client"

import { useCallback, useSyncExternalStore } from "react"
import { Color, SRGBColorSpace } from "three"

// r3f <Canvas> 안쪽은 별도 리콘실러라 next-themes의 React 컨텍스트가 넘어오지 않는다.
// 그래서 <html class="dark">를 직접 구독하는 외부 스토어로 다크 여부를 읽는다.
const listeners = new Set<() => void>()
let observer: MutationObserver | null = null

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!observer && typeof document !== "undefined") {
    observer = new MutationObserver(() => listeners.forEach((notify) => notify()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      observer?.disconnect()
      observer = null
    }
  }
}

const getSnapshot = () => document.documentElement.classList.contains("dark")
const getServerSnapshot = () => false

export function useTopologyDark() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

const scratch = new Color()
const hsl = { h: 0, s: 0, l: 0 }

/**
 * 라이트 기준으로 정한 가구 색을 다크 씬용으로 눌러 준다.
 * 밝은 면(상판·흰 가전·벽걸이 등)만 명도를 압축하고, 이미 어두운 색은 거의 그대로 둔다.
 * emissive와 짝을 이루는 포인트 색에는 쓰지 않는다.
 */
export function toneColor(hex: string, dark: boolean) {
  if (!dark) return hex
  // 명도 기준은 눈에 보이는 sRGB 값이어야 "밝은 면"을 제대로 골라낸다(작업 공간은 선형).
  scratch.set(hex).getHSL(hsl, SRGBColorSpace)
  // 크림·아이보리처럼 밝고 채도 높은 색은 명도만 낮추면 겨자색으로 탁해지므로 채도도 함께 뺀다.
  const bright = hsl.l > 0.5
  const l = bright ? 0.27 + (hsl.l - 0.5) * 0.45 : hsl.l * 0.85
  scratch.setHSL(hsl.h, hsl.s * (bright ? 0.5 : 0.85), l, SRGBColorSpace)
  return `#${scratch.getHexString()}`
}

export function useTone() {
  const dark = useTopologyDark()
  return useCallback((hex: string) => toneColor(hex, dark), [dark])
}

export const TOPOLOGY_PALETTE = {
  light: {
    floorBase: "#cbb28f",
    floorTop: "#f3ead9",
    wall: "#d7e6ea",
    wallOpacity: 0.24,
    partition: "#a9c9bb",
    background: "#f3ead9",
  },
  dark: {
    floorBase: "#3a2f26",
    floorTop: "#2b2520",
    wall: "#6f8894",
    wallOpacity: 0.2,
    partition: "#4b665b",
    background: "#1d1a17",
  },
} as const

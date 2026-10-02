"use client"

import { useEffect, useRef, useState } from "react"
import { Minus, Palette, Square, X } from "lucide-react"
import { ThemeControls } from "@/components/theme/theme-controls"
import { useThemeConfig } from "@/components/theme/theme-config-provider"

// glow_platform의 테마 원격 제어기와 같은 방식: 루트에 떠 있는 드래그·최소화·닫기 가능한 레이어.
// 루트 레이아웃에 있어서 라우트가 바뀌어도 상태(미리보기·위치·최소화)가 유지된다.
// 소유자 로그인 + "원격 제어기 표시" 스위치가 켜졌을 때만 서버가 이 컴포넌트를 렌더한다.
const POS_KEY = "devdeck.themeRemote.pos"
const MIN_KEY = "devdeck.themeRemote.min"
const WIDTH = 360
const MARGIN = 8

type Pos = { x: number; y: number }

const readStorage = (key: string) => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
const writeStorage = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 저장 불가(사생활 보호 모드 등)여도 레이어는 동작한다.
  }
}

const clampPos = (pos: Pos, el: HTMLElement | null): Pos => {
  const w = el?.offsetWidth ?? WIDTH
  const h = el?.offsetHeight ?? 48
  return {
    x: Math.min(Math.max(MARGIN, pos.x), Math.max(MARGIN, window.innerWidth - w - MARGIN)),
    y: Math.min(Math.max(MARGIN, pos.y), Math.max(MARGIN, window.innerHeight - h - MARGIN)),
  }
}

export function ThemeRemoteLayer() {
  const { config, saved } = useThemeConfig()
  const wrapper = useRef<HTMLDivElement>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const [pos, setPos] = useState<Pos | null>(null)
  const [minimized, setMinimized] = useState(true)
  const [closed, setClosed] = useState(false)
  const dirty = JSON.stringify(config) !== JSON.stringify(saved)

  // 하이드레이션 이후에 저장된 위치/상태를 읽는다(서버 렌더와 어긋나지 않게).
  useEffect(() => {
    setMinimized(readStorage(MIN_KEY) !== "0")
    try {
      const raw = JSON.parse(readStorage(POS_KEY) ?? "null")
      if (raw && Number.isFinite(raw.x) && Number.isFinite(raw.y)) {
        setPos(clampPos(raw, null))
        return
      }
    } catch {
      // 깨진 값은 무시하고 기본 위치를 쓴다.
    }
    setPos({ x: Math.max(MARGIN, window.innerWidth - WIDTH - 16), y: 72 })
  }, [])

  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clampPos(p, wrapper.current) : p))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // 최소화/복원으로 크기가 바뀌면 화면 밖으로 나가지 않게 다시 맞춘다.
  useEffect(() => {
    setPos((p) => (p ? clampPos(p, wrapper.current) : p))
  }, [minimized])

  if (closed || !pos) return null

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setPos(clampPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }, wrapper.current))
  }
  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    writeStorage(POS_KEY, JSON.stringify(pos))
  }
  const toggleMin = () => {
    setMinimized((m) => {
      writeStorage(MIN_KEY, m ? "0" : "1")
      return !m
    })
  }

  return (
    <div
      ref={wrapper}
      role="dialog"
      aria-label="테마 원격 제어기"
      style={{ left: pos.x, top: pos.y, width: `min(${WIDTH}px, calc(100vw - ${MARGIN * 2}px))`, height: minimized ? "auto" : "min(560px, calc(100dvh - 1rem))" }}
      className="fixed z-[90] flex flex-col overflow-hidden rounded-2xl border-2 border-[hsl(var(--lux-champagne))] bg-background text-foreground shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]"
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="flex shrink-0 cursor-move touch-none select-none items-center justify-between gap-2 bg-[hsl(var(--lux-champagne))] px-3 py-2 text-[hsl(var(--lux-espresso))]"
      >
        <span className="flex items-center gap-2 text-sm font-bold">
          <Palette className="size-4" />
          테마 원격 제어기
          {dirty ? <span className="rounded-full bg-black/15 px-1.5 text-[10px] font-semibold">미저장</span> : null}
        </span>
        <span className="flex items-center gap-1">
          <button type="button" onClick={toggleMin} title={minimized ? "원래대로" : "최소화"} aria-label={minimized ? "원래대로" : "최소화"} className="rounded p-1 hover:bg-black/10">
            {minimized ? <Square className="size-3.5" /> : <Minus className="size-3.5" />}
          </button>
          <button type="button" onClick={() => setClosed(true)} title="닫기 (새로고침하면 다시 표시)" aria-label="닫기" className="rounded p-1 hover:bg-black/10">
            <X className="size-4" />
          </button>
        </span>
      </div>
      {/* 최소화해도 탭·아코디언 상태가 유지되도록 언마운트하지 않고 숨기기만 한다. */}
      <div className={minimized ? "hidden" : "min-h-0 flex-1"}>
        <ThemeControls />
      </div>
    </div>
  )
}

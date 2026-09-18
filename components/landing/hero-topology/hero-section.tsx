"use client"

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { HeroVisual } from "@/components/landing/hero-visual"
import { TopologyPanel } from "@/components/landing/hero-topology/topology-panel"
import { cn } from "@/lib/utils"
import type { TopologyData } from "@/lib/landing/topology"

const STORAGE_KEY = "devdeck:landing-hero-view"
const DESKTOP_QUERY = "(min-width: 768px)"
const DRAG_START_PX = 8
const DRAG_COMMIT_RATIO = 0.18

type Slide = 0 | 1

function HeroBlobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -left-24 -top-28 size-[32rem] rounded-full bg-[radial-gradient(circle,hsl(var(--lux-sand)/0.9),transparent_64%)] blur-2xl" />
      <div className="absolute -right-16 top-0 size-[28rem] rounded-full bg-[radial-gradient(circle,hsl(var(--lux-champagne)/0.28),transparent_64%)] blur-2xl" />
      <div className="absolute bottom-0 left-1/3 size-[22rem] rounded-full bg-[radial-gradient(circle,hsl(var(--lux-cognac)/0.16),transparent_64%)] blur-2xl" />
    </div>
  )
}

// 좌측 카피는 고정. 클래식은 히어로 전체 위에 카드를 우측 하단에 얹고, 토폴로지는
// 같은 히어로 박스 전체를 3D 오피스로 채운다. 캔버스·팝업 위 드래그는 캐러셀이 가로채지 않는다.
export function HeroSection({ topology, children }: { topology: TopologyData; children: ReactNode }) {
  const { t } = useI18n()
  const [slide, setSlide] = useState<Slide>(0)
  const [visitedTopology, setVisitedTopology] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)

  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startX: number; pointerId: number; dragging: boolean; offset: number } | null>(null)

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY)

    const sync = () => {
      setIsDesktop(media.matches)
      if (!media.matches) {
        setSlide(0)
        return
      }
      try {
        if (window.localStorage.getItem(STORAGE_KEY) === "topology") {
          setSlide(1)
          setVisitedTopology(true)
        }
      } catch {
        // localStorage 접근 불가(프라이빗 모드 등) — 기본값(클래식) 유지
      }
    }

    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  function commit(next: Slide) {
    setSlide(next)
    if (next === 1) setVisitedTopology(true)
    try {
      window.localStorage.setItem(STORAGE_KEY, next === 1 ? "topology" : "classic")
    } catch {
      // 저장 실패는 무시 — 이번 방문 동안의 전환 자체는 정상 동작
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isDesktop) return
    const target = event.target as HTMLElement
    if (target.closest("a, button, canvas, .topology-dock")) return
    drag.current = { startX: event.clientX, pointerId: event.pointerId, dragging: false, offset: 0 }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state) return
    const delta = event.clientX - state.startX

    if (!state.dragging) {
      if (Math.abs(delta) < DRAG_START_PX) return
      state.dragging = true
      setIsDragging(true)
      event.currentTarget.setPointerCapture(state.pointerId)
      if (delta < 0) setVisitedTopology(true)
    }

    event.preventDefault()
    const atStart = slide === 0 && delta > 0
    const atEnd = slide === 1 && delta < 0
    state.offset = atStart || atEnd ? delta * 0.35 : delta
    setDragOffset(state.offset)
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current
    drag.current = null
    if (!state?.dragging) return

    setIsDragging(false)
    setDragOffset(0)
    try {
      event.currentTarget.releasePointerCapture(state.pointerId)
    } catch {
      // 이미 해제된 경우 무시
    }

    const width = trackRef.current?.clientWidth || 1
    const ratio = state.offset / width
    if (ratio < -DRAG_COMMIT_RATIO && slide === 0) commit(1)
    else if (ratio > DRAG_COMMIT_RATIO && slide === 1) commit(0)
  }

  const width = trackRef.current?.clientWidth || 1
  const dragPercent = (dragOffset / width) * 100
  const translatePercent = -slide * 100 + dragPercent
  const topologyProgress = isDesktop ? Math.min(1, Math.max(0, slide - dragPercent / 100)) : 0
  const veilStyle = {
    opacity: topologyProgress,
    transition: isDragging ? "none" : "opacity 0.35s ease-out",
  } as const

  return (
    <div
      className={cn("relative overflow-x-clip md:h-[640px]", isDragging && "select-none [&_*]:cursor-grabbing")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="absolute inset-0 hidden overflow-hidden md:block">
          <div
            ref={trackRef}
            className={cn("flex h-full w-full", !isDragging && "transition-transform duration-350 ease-out")}
            style={{ transform: `translateX(${translatePercent}%)` }}
          >
            <div className="relative h-full w-full shrink-0">
              <HeroBlobs />
              <HeroVisual />
            </div>
            <div className="relative h-full w-full shrink-0">
              {visitedTopology ? (
                <TopologyPanel
                  data={topology}
                  className="h-full md:h-full"
                  panPixels={100}
                  active={isDesktop && slide === 1}
                />
              ) : (
                <div className="h-full bg-[#efe6d8]" />
              )}
            </div>
          </div>
        </div>
      <div className="md:hidden">
        <HeroBlobs />
        <HeroVisual />
      </div>

      <div className="pointer-events-none relative z-20 mx-auto max-w-6xl px-5 pb-44 pt-20 md:h-full md:pb-28 md:pt-28">
        <div
          className={cn(
            "group relative w-fit max-w-2xl origin-top-left transition-transform duration-350 ease-out",
            slide === 1 && "is-topology md:scale-[0.62]"
          )}
        >
          <div aria-hidden className="hero-copy-veil hidden md:block" style={veilStyle} />
          <div className="pointer-events-auto relative">{children}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => commit(0)}
        disabled={slide === 0}
        aria-label={t("landing.classic")}
        className="absolute left-3 top-1/2 z-30 hidden -translate-y-1/2 rounded-full bg-background/70 p-2 shadow-sm ring-1 ring-foreground/10 backdrop-blur-md transition hover:bg-background disabled:pointer-events-none disabled:opacity-30 md:inline-flex"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => commit(1)}
        disabled={slide === 1}
        aria-label={t("landing.topology")}
        className={cn(
          "absolute right-5 top-1/2 z-30 hidden -translate-y-1/2 rounded-full bg-background/80 p-2.5 shadow-sm backdrop-blur-md transition-colors hover:bg-background disabled:pointer-events-none disabled:opacity-30 md:inline-flex",
          slide === 0 ? "hero-topology-cue" : "ring-1 ring-foreground/10"
        )}
      >
        <ChevronRight className="size-5" />
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 hidden justify-center gap-2 md:flex">
        {([0, 1] as const).map((index) => (
          <button
            key={index}
            type="button"
            onClick={() => commit(index)}
            aria-label={index === 0 ? t("landing.classic") : t("landing.topology")}
            aria-current={slide === index}
            className={cn(
              "pointer-events-auto h-2 rounded-full transition-all",
              slide === index ? "w-5 bg-foreground" : "w-2 bg-foreground/25 hover:bg-foreground/40"
            )}
          />
        ))}
      </div>
    </div>
  )
}

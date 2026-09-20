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
// 같은 히어로 박스 전체를 3D 오피스로 채운다. 캔버스·팝업 위 드래그는 캐러셀이
// 가로채지 않고, 세로 이동이 가로보다 크면(스크롤 의도) 스와이프 자체를 포기해서
// 모바일 세로 스크롤과도 부딪히지 않는다.
export function HeroSection({ topology, children }: { topology: TopologyData; children: ReactNode }) {
  const { t } = useI18n()
  const [slide, setSlide] = useState<Slide>(0)
  const [visitedTopology, setVisitedTopology] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)

  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{
    startX: number
    startY: number
    pointerId: number
    dragging: boolean
    aborted: boolean
    offset: number
  } | null>(null)

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY)
    const sync = () => setIsDesktop(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  // 마지막으로 보던 슬라이드 복원 — 이제 모바일에서도 같은 캐러셀을 쓰므로
  // 화면 크기와 무관하게 한 번만 복원한다(예전엔 데스크톱 전용이었다).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "topology") {
        setSlide(1)
        setVisitedTopology(true)
      }
    } catch {
      // localStorage 접근 불가(프라이빗 모드 등) — 기본값(클래식) 유지
    }
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
    const target = event.target as HTMLElement
    if (target.closest("a, button, canvas, .topology-dock")) return
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      dragging: false,
      aborted: false,
      offset: 0,
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state || state.aborted) return
    const deltaX = event.clientX - state.startX
    const deltaY = event.clientY - state.startY

    if (!state.dragging) {
      // 세로 이동이 가로보다 크면 스크롤 의도로 보고 이 제스처를 포기한다 —
      // preventDefault를 안 해서 브라우저 기본 세로 스크롤이 그대로 진행된다.
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > DRAG_START_PX) {
        state.aborted = true
        return
      }
      if (Math.abs(deltaX) < DRAG_START_PX) return
      state.dragging = true
      setIsDragging(true)
      event.currentTarget.setPointerCapture(state.pointerId)
      if (deltaX < 0) setVisitedTopology(true)
    }

    event.preventDefault()
    const atStart = slide === 0 && deltaX > 0
    const atEnd = slide === 1 && deltaX < 0
    state.offset = atStart || atEnd ? deltaX * 0.35 : deltaX
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
  const topologyProgress = Math.min(1, Math.max(0, slide - dragPercent / 100))
  const veilStyle = {
    opacity: topologyProgress,
    transition: isDragging ? "none" : "opacity 0.35s ease-out",
  } as const

  return (
    <div
      className={cn(
        "relative h-[560px] touch-pan-y overflow-x-clip md:h-[640px]",
        isDragging && "select-none [&_*]:cursor-grabbing"
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="absolute inset-0 overflow-hidden">
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
                className="h-full"
                panPixels={isDesktop ? 100 : 0}
                active={slide === 1}
              />
            ) : (
              <div className="h-full bg-[#efe6d8] dark:bg-[#1d1a17]" />
            )}
          </div>
        </div>
      </div>

      {/* 카피는 항상 absolute — 화면 크기와 무관하게 히어로 박스 높이(h-[560px]/
          md:h-[640px])에 영향을 주지 않는다. 이전엔 모바일에서 카피가 일반 흐름
          안에 있어서 그 높이가 곧 히어로 박스 높이였는데(토폴로지가 없었으니
          가능했던 방식), 이제 모바일에도 고정 높이 캔버스가 필요해서 그 전제가
          깨졌다. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 mx-auto max-w-6xl px-5 pb-44 pt-20 md:pb-28 md:pt-28">
        <div
          className={cn(
            "group relative w-fit max-w-2xl origin-top-left transition-transform duration-350 ease-out",
            slide === 1 && "is-topology scale-[0.55] md:scale-[0.62]"
          )}
        >
          <div aria-hidden className="hero-copy-veil" style={veilStyle} />
          <div className="pointer-events-auto relative">{children}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => commit(0)}
        disabled={slide === 0}
        aria-label={t("landing.classic")}
        className="absolute left-3 top-1/2 z-30 inline-flex -translate-y-1/2 rounded-full bg-background/70 p-2 shadow-sm ring-1 ring-foreground/10 backdrop-blur-md transition hover:bg-background disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => commit(1)}
        disabled={slide === 1}
        aria-label={t("landing.topology")}
        className={cn(
          "absolute right-5 top-1/2 z-30 inline-flex -translate-y-1/2 rounded-full bg-background/80 p-2.5 shadow-sm backdrop-blur-md transition-colors hover:bg-background disabled:pointer-events-none disabled:opacity-30",
          slide === 0 ? "hero-topology-cue" : "ring-1 ring-foreground/10"
        )}
      >
        <ChevronRight className="size-5" />
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center gap-2">
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

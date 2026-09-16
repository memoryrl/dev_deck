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
import { TopologyPanel } from "@/components/landing/hero-topology/topology-panel"
import { cn } from "@/lib/utils"
import type { TopologyData } from "@/lib/landing/topology"

const STORAGE_KEY = "devdeck:landing-hero-view"
const DESKTOP_QUERY = "(min-width: 768px)"
const DRAG_START_PX = 8 // 이 이상 움직여야 클릭이 아니라 드래그로 인정한다
const DRAG_COMMIT_RATIO = 0.18 // 트랙 너비의 18% 이상 끌면 슬라이드 전환

type Slide = 0 | 1

// 우측 상단 스위치는 두 화면이 "같은 자리에서 바뀐다"는 느낌이라 헷갈린다는 피드백에
// 따라, 좌우 화살표 + 하단 점 인디케이터 + 드래그 스와이프로 넘기는 캐러셀로 바꿨다.
// 3D 씬(topology-scene.tsx) 안에는 카메라를 돌리는 자체 드래그가 이미 있어서, 캔버스나
// 게시물 팝업(.topology-dock) 위에서 시작한 드래그는 캐러셀이 가로채지 않고 그대로 넘긴다.
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
    // 3D 카메라 드래그(canvas)나 게시물 팝업 위 드래그는 캐러셀이 가로채지 않는다.
    if (target.closest("canvas") || target.closest(".topology-dock")) return
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

  return (
    <div
      className={cn("relative", isDragging && "select-none [&_*]:cursor-grabbing")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="overflow-hidden">
        <div
          ref={trackRef}
          className={cn("flex w-full items-stretch", !isDragging && "transition-transform duration-350 ease-out")}
          style={{ transform: `translateX(${translatePercent}%)` }}
        >
          <div className="w-full shrink-0">{children}</div>
          <div className="w-full shrink-0">
            {isDesktop && visitedTopology ? <TopologyPanel data={topology} /> : <div className="h-[560px] md:h-[640px]" />}
          </div>
        </div>
      </div>

      {isDesktop ? (
        <>
          <button
            type="button"
            onClick={() => commit(0)}
            disabled={slide === 0}
            aria-label={t("landing.classic")}
            className="absolute left-3 top-1/2 z-30 -translate-y-1/2 rounded-full bg-background/70 p-2 shadow-sm ring-1 ring-foreground/10 backdrop-blur-md transition hover:bg-background disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => commit(1)}
            disabled={slide === 1}
            aria-label={t("landing.topology")}
            className={cn(
              "absolute right-5 top-1/2 z-30 -translate-y-1/2 rounded-full bg-background/80 p-2.5 shadow-sm backdrop-blur-md transition-colors hover:bg-background disabled:pointer-events-none disabled:opacity-30",
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
        </>
      ) : null}
    </div>
  )
}

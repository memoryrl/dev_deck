"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { GripVertical, X } from "lucide-react"
import { cn } from "@/lib/utils"

// kware_aew 협업캘린더의 "듀얼 보기"(좌 캘린더 + 우 정보 패널, 드래그로 폭 조절)를 옮긴 공용 레이아웃.
// - 기본 비율은 12컬럼 기준 7:5(메인:패널). 폭은 px이 아니라 "패널이 차지하는 비율"로 저장해서
//   사이드바 유무·창 크기가 달라져도 같은 비율을 유지한다.
// - 넓은지 좁은지는 뷰포트가 아니라 이 컨테이너의 폭으로 정한다(관리자 사이드바가 폭을 먹기 때문).
//   좁으면 위아래로 쌓고 스플리터는 숨긴다.
const DEFAULT_PANEL_RATIO = 5 / 12
const PANEL_MIN_PX = 280
const MAIN_MIN_PX = 360
const STACK_BELOW_PX = PANEL_MIN_PX + MAIN_MIN_PX + 80 // 이보다 좁으면 쌓는다
const SPLITTER_PX = 16
const KEY_STEP_PX = 24

const readRatio = (key: string) => {
  try {
    const raw = parseFloat(window.localStorage.getItem(key) ?? "")
    return Number.isFinite(raw) && raw > 0.15 && raw < 0.7 ? raw : DEFAULT_PANEL_RATIO
  } catch {
    return DEFAULT_PANEL_RATIO
  }
}

export function SplitPanel({
  main,
  panel,
  panelTitle,
  panelAction,
  storageKey = "devdeck.splitPanelRatio",
}: {
  main: React.ReactNode
  panel: React.ReactNode
  panelTitle: React.ReactNode
  /** 패널 제목 줄 오른쪽(닫기 버튼 등) */
  panelAction?: React.ReactNode
  storageKey?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [ratio, setRatio] = useState(DEFAULT_PANEL_RATIO)
  const [wide, setWide] = useState(false)

  // 저장된 비율은 하이드레이션 이후에 읽는다(서버 렌더와 어긋나지 않게).
  useEffect(() => setRatio(readRatio(storageKey)), [storageKey])
  useEffect(() => {
    const el = box.current
    if (!el) return
    const sync = () => setWide(el.clientWidth >= STACK_BELOW_PX)
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 패널·메인 최소 폭을 지키는 범위로 비율을 자른다.
  const clampRatio = useCallback((next: number) => {
    const total = (box.current?.clientWidth ?? 1000) - SPLITTER_PX
    const min = PANEL_MIN_PX / total
    const max = 1 - MAIN_MIN_PX / total
    return Math.min(Math.max(next, min), Math.max(min, max))
  }, [])
  const save = (value: number) => {
    try {
      window.localStorage.setItem(storageKey, String(value))
    } catch {
      // 저장 못 해도 이번 세션에는 적용된다.
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !box.current) return
    const rect = box.current.getBoundingClientRect()
    const total = rect.width - SPLITTER_PX
    // 포인터 오른쪽에 남는 폭 = 패널 폭 (스플리터 가운데를 잡는 만큼 보정)
    setRatio(clampRatio((rect.right - e.clientX - SPLITTER_PX / 2) / total))
  }
  const onPointerUp = () => {
    if (!dragging.current) return
    dragging.current = false
    setRatio((current) => {
      save(current)
      return current
    })
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
    e.preventDefault()
    const total = (box.current?.clientWidth ?? 1000) - SPLITTER_PX
    const next = clampRatio(ratio + ((e.key === "ArrowLeft" ? KEY_STEP_PX : -KEY_STEP_PX) / total))
    setRatio(next)
    save(next)
  }
  const reset = () => {
    setRatio(DEFAULT_PANEL_RATIO)
    save(DEFAULT_PANEL_RATIO)
  }

  const panelRatio = wide ? clampRatio(ratio) : ratio

  return (
    <div
      ref={box}
      className={cn("grid", wide ? "gap-0" : "gap-4")}
      // 비율 그대로 fr로 나눈다 → 7:5. minmax(0, …)라서 내용이 넓어도 컬럼이 밀려나 잘리지 않는다.
      style={wide ? { gridTemplateColumns: `minmax(0, ${1 - panelRatio}fr) ${SPLITTER_PX}px minmax(0, ${panelRatio}fr)` } : undefined}
    >
      <div className="min-w-0">{main}</div>
      {wide ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="좌우 폭 조절 (좌우 방향키, 더블클릭으로 7:5 초기화)"
          aria-valuenow={Math.round(panelRatio * 100)}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          onDoubleClick={reset}
          className="group relative flex cursor-col-resize touch-none select-none items-center justify-center focus-visible:outline-none"
        >
          <span aria-hidden className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 rounded-full bg-border transition-colors group-hover:bg-foreground/40 group-focus-visible:bg-foreground/60" />
          {/* 세로 가운데 손잡이 */}
          <span
            aria-hidden
            className="relative z-10 grid h-14 w-4 place-items-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors group-hover:border-foreground/40 group-hover:text-foreground group-focus-visible:border-foreground/60 group-focus-visible:text-foreground"
          >
            <GripVertical className="size-3.5" />
          </span>
        </div>
      ) : null}
      <aside aria-label="상세 정보" className="flex min-h-[20rem] min-w-0 flex-col overflow-hidden rounded-xl border bg-white dark:bg-card lg:max-h-[calc(100dvh-8rem)]">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
          <h3 className="min-w-0 truncate font-display text-base font-bold">{panelTitle}</h3>
          {panelAction}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{panel}</div>
      </aside>
    </div>
  )
}

export function PanelCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="패널 닫기" className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      <X className="size-4" />
    </button>
  )
}

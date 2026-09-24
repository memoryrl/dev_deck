"use client"

import dynamic from "next/dynamic"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowRight } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import {
  escortAnyLinkClick,
  escortTargetLabel,
  isExternalHref,
  registerEscortHandler,
  resolveEscortModule,
} from "@/lib/landing/escort-bus"
import { topologyFromNavNodes, type TopologyData } from "@/lib/landing/topology-modules"
import type { NavNode } from "@/types/menu"

// 랜딩의 토폴로지 슬라이드가 화면에 없을 때(다른 페이지, 클래식 히어로) 헤더·푸터·모바일
// 메뉴를 누르면 이 오버레이가 대신 나선다. 화면 전체를 토폴로지 방으로 덮고, 해당 메뉴의
// 로봇이 "따라오세요" 하며 문 밖으로 나간 뒤 베일을 올리고 실제 이동한다 — 목적지의
// 스켈레톤 UI가 보이기 전에 안내 연출이 먼저 나온다. 방 데이터는 헤더가 이미 가진
// 내비 트리로 만들어 랜딩과 같은 책상 배치·로봇 배정을 쓴다.

type Escort = { moduleId: string; href: string; label: string; data: TopologyData }

const LEAVE_VEIL_MS = 420
// 씬 로드 실패(WebGL 없음, 청크 로드 실패 등)로 로봇이 끝내 나가지 않으면 그냥 이동한다
const ESCORT_SAFETY_MS = 10000
// 첫 클릭에서 three.js 청크·로봇 모델을 기다리지 않게, 화면이 잠잠해진 뒤 미리 받아 둔다
const WARM_DELAY_MS = 2500

function loadScene() {
  return import("@/components/landing/hero-topology/topology-scene")
}

const TopologyScene = dynamic(() => loadScene().then((mod) => mod.TopologyScene), {
  ssr: false,
  loading: () => <SceneLoading />,
})

function SceneLoading() {
  const { t } = useI18n()
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      {t("landing.topologyLoading")}
    </div>
  )
}

// 이동이 끝나 주소가 바뀌면 오버레이를 걷는다. useSearchParams는 정적 프리렌더에서
// 가장 가까운 Suspense까지 클라이언트 렌더로 미루므로, 이 작은 감시자만 따로 감싼다.
function RouteWatcher({ onChange }: { onChange: () => void }) {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const seen = useRef<string | null>(null)
  useEffect(() => {
    const key = `${pathname}?${search}`
    if (seen.current != null && seen.current !== key) onChange()
    seen.current = key
  }, [pathname, search, onChange])
  return null
}

function currentLocation() {
  return `${window.location.pathname}${window.location.search}`
}

function warmScene() {
  let cancelled = false
  let idleId: number | null = null
  const timer = window.setTimeout(() => {
    const run = () => {
      if (cancelled) return
      void loadScene().catch(() => {
        // 미리 받기 실패는 무시 — 실제 클릭 시 다시 시도한다
      })
    }
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(run, { timeout: 4000 })
    } else {
      run()
    }
  }, WARM_DELAY_MS)
  return () => {
    cancelled = true
    window.clearTimeout(timer)
    if (idleId != null && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId)
  }
}

export function EscortOverlay({
  navNodes,
  owner,
}: {
  /** 헤더가 쓰는 내비 트리(라벨은 이미 현지화된 상태) */
  navNodes: NavNode[]
  owner: boolean
}) {
  const { t, locale, dictionary } = useI18n()
  const router = useRouter()
  // t는 매 렌더 새 함수라 사전·로케일로 대신 메모한다
  const data = useMemo(
    () => topologyFromNavNodes(navNodes, owner, t),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navNodes, owner, locale, dictionary]
  )
  const hasSeated = data.modules.some((module) => !module.vacant)
  const [escort, setEscort] = useState<Escort | null>(null)
  const [leaving, setLeaving] = useState(false)
  // 베일이 다 덮인 뒤에는 씬을 먼저 내리고 나서 이동한다. 이동 커밋에서 헤더가 새 props로
  // 다시 그려지며 Canvas가 리렌더 직후 언마운트되면 R3F의 비동기 configure→render가
  // 사라진 컨테이너에 이벤트를 붙이려다 터지는 경합이 있어서다.
  const [sceneDone, setSceneDone] = useState(false)
  const navigated = useRef(false)
  const leavingRef = useRef(false)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
  }

  const reset = useCallback(() => {
    clearTimers()
    navigated.current = false
    leavingRef.current = false
    setEscort(null)
    setLeaving(false)
    setSceneDone(false)
  }, [])

  const navigateTo = useCallback(
    (href: string) => {
      if (navigated.current) return
      navigated.current = true
      setSceneDone(true)
      if (isExternalHref(href)) window.location.assign(href)
      else router.push(href)
    },
    [router]
  )

  // 베일을 올리고 다 덮이면 이동한다 — 로봇이 나간 뒤에도, "바로 이동"도, 안전 타임아웃도 같은 길
  const leave = useCallback(
    (href: string) => {
      if (leavingRef.current) return
      leavingRef.current = true
      setLeaving(true)
      timers.current.push(window.setTimeout(() => navigateTo(href), LEAVE_VEIL_MS))
    },
    [navigateTo]
  )

  const finishEscort = useCallback(() => {
    if (escort) leave(escort.href)
  }, [escort, leave])

  useEffect(() => {
    return registerEscortHandler(
      (request) => {
        if (escort) return true
        // 이미 있는 화면으로의 링크는 주소가 안 바뀌어 오버레이가 걷히지 않으므로 연출을 건너뛴다
        if (request.href === currentLocation()) return false
        const target = resolveEscortModule(data.modules, request)
        if (!target) return false
        if (!isExternalHref(request.href)) router.prefetch(request.href)
        navigated.current = false
        leavingRef.current = false
        const label = request.strict ? escortTargetLabel(target, request.href, request.label) : request.label
        // 안내 중 헤더가 새 내비 데이터로 다시 그려져도 방이 바뀌지 않게 스냅샷을 든다
        setEscort({ moduleId: target.id, href: request.href, label, data })
        timers.current.push(window.setTimeout(() => leave(request.href), ESCORT_SAFETY_MS))
        return true
      },
      { fallback: true }
    )
  }, [escort, data, router, leave])

  useEffect(() => {
    if (!hasSeated) return
    return warmScene()
  }, [hasSeated])

  // 메뉴가 아닌 모든 내부 링크(본문 카드, 버튼형 링크 등)도 화면이 바뀌면 로봇이 안내한다.
  // 맡을 로봇이 분명하지 않으면(strict) 연출 없이 평소처럼 이동한다.
  useEffect(() => {
    if (!hasSeated) return
    document.addEventListener("click", escortAnyLinkClick, true)
    return () => document.removeEventListener("click", escortAnyLinkClick, true)
  }, [hasSeated])

  useEffect(() => clearTimers, [])

  return (
    <>
      <Suspense fallback={null}>
        <RouteWatcher onChange={reset} />
      </Suspense>
      {escort
        ? createPortal(
            <div
              className="topology-escort-overlay bg-[#efe6d8] dark:bg-[#1d1a17]"
              role="dialog"
              aria-modal="true"
              aria-label={t("landing.robotFollowMeDetail", { label: escort.label })}
            >
              {!sceneDone ? (
                <TopologyScene
                  data={escort.data}
                  activeModuleId={escort.moduleId}
                  onSelectModule={() => {}}
                  active
                  escortModuleId={escort.moduleId}
                  escortSpeech={{
                    title: t("landing.robotFollowMe"),
                    detail: t("landing.robotFollowMeDetail", { label: escort.label }),
                  }}
                  onEscortExit={finishEscort}
                />
              ) : null}

              {!leaving ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center md:bottom-8">
                  <button
                    type="button"
                    onClick={() => leave(escort.href)}
                    className="topology-escort-skip pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-md transition hover:bg-background"
                  >
                    {t("landing.escortSkip")}
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              ) : null}

              {leaving ? (
                <div className="topology-leave-veil" role="status" aria-live="polite">
                  <p className="topology-leave-veil-text">{t("landing.escortLeaving", { label: escort.label })}</p>
                </div>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  )
}

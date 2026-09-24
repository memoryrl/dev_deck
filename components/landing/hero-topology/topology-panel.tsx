"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import { createPortal } from "react-dom"
import { ArrowRight, ArrowUpRight, X } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { TopologyIntro } from "@/components/landing/hero-topology/topology-intro"
import {
  escortTargetLabel,
  isExternalHref,
  isPlainLeftClick,
  prefersReducedMotion,
  registerEscortHandler,
  resolveEscortModule,
} from "@/lib/landing/escort-bus"
import { cn } from "@/lib/utils"
import type { TopologyData, TopologyModuleNode, TopologyTint } from "@/lib/landing/topology"

const INTRO_STORAGE_KEY = "devdeck:topology-intro-seen"

function TopologyLoading() {
  const { t } = useI18n()
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      {t("landing.topologyLoading")}
    </div>
  )
}

const TopologyScene = dynamic(
  () => import("@/components/landing/hero-topology/topology-scene").then((mod) => mod.TopologyScene),
  {
    ssr: false,
    loading: () => <TopologyLoading />,
  }
)

const TINT_FACE: Record<TopologyTint, { wash: string; hair: string; glow: string; index: string }> = {
  champagne: {
    wash: "from-[hsl(var(--lux-champagne)/0.34)] via-background/85 to-background/92",
    hair: "bg-[hsl(var(--lux-champagne))]",
    glow: "shadow-[0_28px_64px_-32px_hsl(24_20%_10%/0.55),0_12px_28px_-18px_hsl(var(--lux-champagne)/0.55)]",
    index: "text-[hsl(var(--lux-champagne))]",
  },
  cognac: {
    wash: "from-[hsl(var(--lux-cognac)/0.28)] via-background/85 to-background/92",
    hair: "bg-[hsl(var(--lux-cognac))]",
    glow: "shadow-[0_28px_64px_-32px_hsl(24_20%_10%/0.55),0_12px_28px_-18px_hsl(var(--lux-cognac)/0.45)]",
    index: "text-[hsl(var(--lux-cognac))]",
  },
  espresso: {
    wash: "from-[hsl(var(--lux-espresso)/0.18)] via-background/85 to-background/92",
    hair: "bg-foreground/70",
    glow: "shadow-[0_28px_64px_-32px_hsl(24_20%_10%/0.6),0_12px_28px_-18px_hsl(20_13%_9%/0.28)]",
    index: "text-foreground/55",
  },
}

// 모듈 id가 이제 동적인 메뉴 UUID라 특정 문자열과 비교할 수 없다 — 목록 내 위치(짝/홀)로
// 좌우를 번갈아 배치한다.
function popupSide(index: number): "left" | "right" {
  return index % 2 === 0 ? "left" : "right"
}

type Escort = { moduleId: string; href: string; label: string }

// 로봇이 문 밖으로 사라진 뒤 화면을 덮는 베일이 다 차오르는 시간 — CSS(.topology-leave-veil)와 맞춘다
const LEAVE_VEIL_MS = 420

export function TopologyPanel({
  data,
  className,
  panPixels = 0,
  active = true,
}: {
  data: TopologyData
  className?: string
  panPixels?: number
  /** 이 패널이 실제로 화면에 보이는 슬라이드일 때만 true — 씬의 렌더 루프를 켠다 */
  active?: boolean
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const activeModule = data.modules.find((module) => module.id === activeModuleId) ?? null
  const [displayed, setDisplayed] = useState<TopologyModuleNode | null>(null)
  // 메뉴/하위 메뉴 링크를 누르면 바로 이동하지 않고, 그 책상의 로봇이 "따라오세요" 하고
  // 문 밖으로 나간 뒤(escort) 화면을 베일로 덮고(leaving) 실제 이동한다.
  const [escort, setEscort] = useState<Escort | null>(null)
  const [leaving, setLeaving] = useState(false)
  const navigated = useRef(false)
  const leaveTimer = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  // 이 컴포넌트는 사용자가 토폴로지 뷰로 전환한 뒤에만 마운트되므로(hero-section.tsx
  // 참고) 서버 렌더링을 거치지 않는다 — localStorage를 초기값에서 바로 읽어도 안전하다.
  // 처음 방문(키 없음)이면 카드를 펼친 채로 시작하고, 이미 본 적 있으면 접힌 아이콘으로
  // 시작한다 — 완전히 사라지는 게 아니라 언제든 아이콘을 눌러 다시 펼칠 수 있다.
  const [introOpen, setIntroOpen] = useState(() => {
    try {
      return window.localStorage.getItem(INTRO_STORAGE_KEY) !== "1"
    } catch {
      return true
    }
  })

  useEffect(() => {
    if (activeModule) setDisplayed(activeModule)
  }, [activeModule])

  useEffect(() => {
    if (activeModuleId) closeIntro()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModuleId])

  function closeIntro() {
    setIntroOpen(false)
    try {
      window.localStorage.setItem(INTRO_STORAGE_KEY, "1")
    } catch {
      // 저장 실패는 무시 — 이번 방문 동안만 접힌 상태로 남는다
    }
  }

  function reopenIntro() {
    setIntroOpen(true)
    setActiveModuleId(null) // 안내 카드와 책상 팝업은 같은 좌측 하단 자리를 쓰므로 겹치지 않게 팝업을 닫는다
  }

  const navigateTo = useCallback(
    (href: string) => {
      if (navigated.current) return
      navigated.current = true
      if (isExternalHref(href)) window.location.assign(href)
      else router.push(href)
    },
    [router]
  )

  // 로봇이 문 밖으로 사라진 뒤: 베일을 올리고 다 덮이면 이동한다
  const finishEscort = useCallback(() => {
    if (!escort || leaving) return
    setLeaving(true)
    leaveTimer.current = window.setTimeout(() => navigateTo(escort.href), LEAVE_VEIL_MS)
  }, [escort, leaving, navigateTo])

  useEffect(() => {
    return () => {
      if (leaveTimer.current != null) window.clearTimeout(leaveTimer.current)
    }
  }, [])

  const startEscort = useCallback(
    (moduleId: string, href: string, label: string) => {
      if (!isExternalHref(href)) router.prefetch(href)
      setActiveModuleId(moduleId)
      setEscort({ moduleId, href, label })
    },
    [router]
  )

  function handleNavigate(event: ReactMouseEvent<HTMLAnchorElement>, href: string, label: string) {
    if (escort || !activeModule || activeModule.vacant) return
    if (!isPlainLeftClick(event)) return
    // 움직임 최소화 설정이면 연출 없이 링크 기본 동작으로 바로 이동
    if (prefersReducedMotion()) return
    event.preventDefault()
    startEscort(activeModule.id, href, label)
  }

  // 헤더·푸터 내비게이션 링크도 같은 연출을 탄다 — 이 패널이 실제로 보이는 슬라이드일 때만
  // 맡는다. 이미 안내 중이면 추가 클릭은 삼킨다(곧 첫 목적지로 이동하므로, 오버레이가
  // 겹쳐 뜨거나 링크가 먼저 튀어 나가지 않게). 푸터처럼 화면 아래에서 눌렀으면 로봇이
  // 보이도록 히어로를 뷰포트 안으로 스크롤한다.
  useEffect(() => {
    if (!active) return
    return registerEscortHandler((request) => {
      if (escort) return true
      const target = resolveEscortModule(data.modules, request)
      if (!target) return false
      const label = request.strict ? escortTargetLabel(target, request.href, request.label) : request.label
      startEscort(target.id, request.href, label)
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      return true
    })
  }, [active, escort, data.modules, startEscort])

  function handleSelectModule(id: string | null) {
    if (escort) return
    setActiveModuleId(id)
  }

  const open = Boolean(activeModule) && !escort
  const activeCard = activeModule ?? displayed
  const activeIndex = activeCard ? data.modules.findIndex((module) => module.id === activeCard.id) : -1
  const side = activeCard ? popupSide(Math.max(activeIndex, 0)) : "left"
  const tint = activeCard ? TINT_FACE[activeCard.tint] : TINT_FACE.champagne

  return (
    <div
      ref={rootRef}
      data-escort-handled=""
      className={cn(
        "relative z-0 h-[560px] w-full scroll-mt-14 overflow-hidden bg-[#efe6d8] dark:bg-[#1d1a17] md:h-[640px]",
        className
      )}
    >
      <TopologyScene
        data={data}
        activeModuleId={activeModuleId}
        onSelectModule={handleSelectModule}
        panPixels={panPixels}
        active={active}
        escortModuleId={escort?.moduleId ?? null}
        escortSpeech={
          escort
            ? {
                title: t("landing.robotFollowMe"),
                detail: t("landing.robotFollowMeDetail", { label: escort.label }),
              }
            : undefined
        }
        onEscortExit={finishEscort}
      />

      <TopologyIntro
        open={introOpen}
        hidden={open || Boolean(escort)}
        modules={data.modules.filter((module) => !module.vacant)}
        onOpen={reopenIntro}
        onClose={closeIntro}
      />

      <div
        className={cn(
          "pointer-events-none absolute bottom-0 z-10 flex w-full px-4 pb-5 md:px-7 md:pb-6",
          side === "left" ? "justify-start" : "justify-end"
        )}
      >
        <aside
          key={activeCard?.id ?? "dock"}
          className={cn("topology-dock w-[min(22.5rem,calc(100%-2rem))]", open && "is-open")}
        >
          {activeCard ? (
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl bg-gradient-to-br ring-1 ring-foreground/10 backdrop-blur-xl",
                tint.wash,
                tint.glow,
                open ? "pointer-events-auto" : "pointer-events-none"
              )}
            >
              <div className="topology-dock-sheen" />
              <span className={cn("absolute inset-x-10 top-0 h-px", tint.hair)} />
              <div className="relative p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {t("landing.deskLatest")}
                    </p>
                    <Link
                      href={activeCard.href}
                      onClick={(event) => handleNavigate(event, activeCard.href, activeCard.label)}
                      className="mt-1 inline-flex items-center gap-1 font-display text-xl font-extrabold tracking-tight hover:underline"
                    >
                      {activeCard.label}
                      <ArrowUpRight className="size-4 opacity-60" />
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveModuleId(null)}
                    className="inline-flex size-8 items-center justify-center rounded-full border border-foreground/10 bg-background/50 text-muted-foreground transition hover:bg-background hover:text-foreground"
                    aria-label={t("common.close")}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                <ul className="mt-4 space-y-1">
                  {activeCard.restricted ? (
                    <li className="rounded-xl bg-background/40 px-3 py-3 text-xs text-muted-foreground">
                      {t("landing.restrictedItems")}
                    </li>
                  ) : activeCard.items.length === 0 ? (
                    <li className="rounded-xl bg-background/40 px-3 py-3 text-xs text-muted-foreground">
                      {t("landing.emptyItems")}
                    </li>
                  ) : (
                    activeCard.items.map((item, index) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={(event) => handleNavigate(event, item.href, item.label)}
                          className="group flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-background/55"
                        >
                          <span
                            className={cn(
                              "mt-0.5 font-display text-[11px] font-bold tabular-nums tracking-wider",
                              tint.index
                            )}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold leading-snug">
                              {item.label}
                            </span>
                            {item.meta ? (
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {item.meta}
                              </span>
                            ) : null}
                          </span>
                          <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 opacity-0 transition group-hover:opacity-50" />
                        </Link>
                      </li>
                    ))
                  )}
                </ul>

                <Link
                  href={activeCard.href}
                  onClick={(event) => handleNavigate(event, activeCard.href, activeCard.label)}
                  className="mt-3 flex items-center justify-between rounded-xl border border-foreground/8 bg-background/40 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground transition hover:bg-background/70 hover:text-foreground"
                >
                  {t("landing.openModule")}
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {/* 안내 연출을 기다리기 싫으면 바로 이동 */}
      {escort && !leaving ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center md:bottom-6">
          <button
            type="button"
            onClick={() => navigateTo(escort.href)}
            className="topology-escort-skip pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-md transition hover:bg-background"
          >
            {t("landing.escortSkip")}
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      ) : null}

      {/* 로봇이 나간 뒤 화면 전체를 덮고 실제 페이지 이동으로 이어지는 베일.
          히어로 트랙이 transform 안이라 fixed가 갇히므로 body로 포털한다. */}
      {escort && leaving
        ? createPortal(
            <div className="topology-leave-veil" role="status" aria-live="polite">
              <p className="topology-leave-veil-text">{t("landing.escortLeaving", { label: escort.label })}</p>
            </div>,
            document.body
          )
        : null}
    </div>
  )
}

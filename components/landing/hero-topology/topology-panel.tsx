"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowUpRight, X } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { TopologyIntro } from "@/components/landing/hero-topology/topology-intro"
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

export function TopologyPanel({
  data,
  className,
  panPixels = 0,
}: {
  data: TopologyData
  className?: string
  panPixels?: number
}) {
  const { t } = useI18n()
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const activeModule = data.modules.find((module) => module.id === activeModuleId) ?? null
  const [displayed, setDisplayed] = useState<TopologyModuleNode | null>(null)
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

  const open = Boolean(activeModule)
  const activeCard = activeModule ?? displayed
  const activeIndex = activeCard ? data.modules.findIndex((module) => module.id === activeCard.id) : -1
  const side = activeCard ? popupSide(Math.max(activeIndex, 0)) : "left"
  const tint = activeCard ? TINT_FACE[activeCard.tint] : TINT_FACE.champagne

  return (
    <div className={cn("relative z-0 h-[560px] w-full overflow-hidden bg-[#efe6d8] md:h-[640px]", className)}>
      <TopologyScene data={data} activeModuleId={activeModuleId} onSelectModule={setActiveModuleId} panPixels={panPixels} />

      <TopologyIntro
        open={introOpen}
        hidden={open}
        modules={data.modules}
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
    </div>
  )
}

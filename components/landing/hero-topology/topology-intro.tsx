"use client"

import { MousePointerClick } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"
import type { TopologyModuleNode, TopologyTint } from "@/lib/landing/topology"

const DOT_CLASS: Record<TopologyTint, string> = {
  champagne: "bg-[hsl(var(--lux-champagne))]",
  cognac: "bg-[hsl(var(--lux-cognac))]",
  espresso: "bg-foreground/70",
}

type TopologyIntroProps = {
  open: boolean
  hidden?: boolean
  modules: Pick<TopologyModuleNode, "id" | "label" | "tint">[]
  onOpen: () => void
  onClose: () => void
}

// 좌측 하단에 안내 카드가 뜬다. "둘러볼게요"를 누르면 같은 자리의 작은 원형 아이콘으로
// 접힌다. 너비/높이를 JS로 재지 않는다 — 그렇게 하면 상자가 히어로 높이까지 커지며
// 내용이 잘리고 흰 면만 남는 현상이 생긴다.
export function TopologyIntro({ open, hidden, modules, onOpen, onClose }: TopologyIntroProps) {
  const { t } = useI18n()

  return (
    <div
      className={cn(
        // 카드 너비는 여기 루트에서 정한다 — absolute 자식의 calc(100%...)는 "가장 가까운
        // position 조상"인 이 div를 기준으로 계산되는데, 루트 자체는 폭 지정이 없으면
        // 인라인 흐름 자식(토글 버튼, 36px)만 보고 스스로를 36px로 줄여버려 카드가
        // 4px짜리로 찌그러지는 버그가 있었다(calc(36px-2rem)). 루트에 직접 폭을 준다.
        "absolute bottom-4 left-4 z-20 w-[min(22rem,calc(100%-2rem))]",
        hidden && "pointer-events-none invisible"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        tabIndex={open ? -1 : 0}
        aria-hidden={open}
        aria-label={t("landing.topologyIntroReopen")}
        className={cn(
          "relative z-10 flex size-9 items-center justify-center rounded-full border border-foreground/10 bg-background/90 text-foreground/70 shadow-md backdrop-blur-xl transition hover:bg-background hover:text-foreground",
          open ? "pointer-events-none opacity-0" : "animate-pulse opacity-100 hover:animate-none"
        )}
      >
        <MousePointerClick className="size-4" />
      </button>

      <div
        className={cn(
          "absolute bottom-0 left-0 w-full origin-bottom-left transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-50 opacity-0"
        )}
      >
        <div className="rounded-2xl border border-foreground/10 bg-background/90 p-4 shadow-lg backdrop-blur-xl">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-foreground/70">
              <MousePointerClick className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-snug">{t("landing.topologyIntroTitle")}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {t("landing.topologyIntroBody")}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {modules.map((module) => (
              <span
                key={module.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-2.5 py-1 text-[11px] font-semibold text-foreground/80"
              >
                <span className={cn("size-1.5 rounded-full", DOT_CLASS[module.tint])} />
                {module.label}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full rounded-lg bg-foreground/90 py-1.5 text-xs font-semibold text-background transition hover:bg-foreground"
          >
            {t("landing.topologyIntroDismiss")}
          </button>
        </div>
      </div>
    </div>
  )
}

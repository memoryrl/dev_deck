import { cn } from "@/lib/utils"
import { BannerBreadcrumb } from "./banner-breadcrumb"
import type { BannerStyleProps } from "./types"

/** 스타일 1 — 그라디언트 카드 (기존 제목 배너) */
export function BannerStyle1({ title, lede, crumbs, actions, art, className }: BannerStyleProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border bg-muted/30 px-6 py-8 md:px-10 md:py-10", className)}>
      <div aria-hidden className={cn("absolute inset-0", art)} />
      {/* 어떤 그라디언트 조합이 걸려도 브레드크럼·제목이 읽히도록 아래→위 스크림 */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/15" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <BannerBreadcrumb crumbs={crumbs} />
          <h1 className={cn("font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl", crumbs.length > 0 ? "mt-3" : null)}>{title}</h1>
          <div className="mt-4 h-1 w-10 rounded-full bg-[hsl(var(--lux-cognac))]" aria-hidden />
          {lede ? <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{lede}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

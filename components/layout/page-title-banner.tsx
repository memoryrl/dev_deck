import type { ReactNode } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { menuBreadcrumbForRequest, type BreadcrumbItem } from "@/lib/menus/breadcrumb"
import { cn } from "@/lib/utils"

export type { BreadcrumbItem }

// 실사 이미지 대신 사이트 팔레트(--lux-*)로 만든 그라디언트 조합 풀을 두고
// 페이지마다 다르게 골라 쓴다 — 외부 이미지 fetch 없이 항상 즉시·안정적으로
// 뜨고, 라이트/다크 테마 토큰을 그대로 쓰므로 테마 전환에도 자동으로 맞는다.
const BANNER_ART = [
  "bg-[radial-gradient(circle_at_12%_20%,hsl(var(--lux-champagne)/0.55),transparent_45%),radial-gradient(circle_at_85%_75%,hsl(var(--lux-cognac)/0.4),transparent_50%),radial-gradient(circle_at_50%_100%,hsl(var(--lux-espresso)/0.22),transparent_55%)]",
  "bg-[radial-gradient(circle_at_85%_15%,hsl(var(--lux-cognac)/0.5),transparent_45%),radial-gradient(circle_at_10%_80%,hsl(var(--lux-champagne)/0.45),transparent_50%)]",
  "bg-[radial-gradient(circle_at_50%_0%,hsl(var(--lux-espresso)/0.3),transparent_50%),radial-gradient(circle_at_15%_90%,hsl(var(--lux-cognac)/0.4),transparent_55%),radial-gradient(circle_at_90%_60%,hsl(var(--lux-champagne)/0.4),transparent_50%)]",
  "bg-[radial-gradient(circle_at_20%_85%,hsl(var(--lux-champagne)/0.5),transparent_50%),radial-gradient(circle_at_75%_20%,hsl(var(--lux-espresso)/0.28),transparent_50%)]",
  "bg-[radial-gradient(circle_at_90%_90%,hsl(var(--lux-cognac)/0.45),transparent_50%),radial-gradient(circle_at_15%_10%,hsl(var(--lux-champagne)/0.5),transparent_45%)]",
  "bg-[radial-gradient(circle_at_50%_50%,hsl(var(--lux-champagne)/0.4),transparent_60%),radial-gradient(circle_at_100%_0%,hsl(var(--lux-cognac)/0.4),transparent_45%)]",
] as const

function pickArt(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (Math.imul(hash, 31) + seed.charCodeAt(i)) >>> 0
  return BANNER_ART[hash % BANNER_ART.length]
}

/**
 * 로그인/회원가입/랜딩을 제외한 페이지 상단에 쓰는 범용 타이틀 배너.
 * 브레드크럼은 메뉴 DB(헤더·관리자)의 1depth > 2depth를 현재 경로로 맞춘다.
 * `breadcrumb`은 메뉴에 없는 하위 화면(글 수정 등)만 뒤에 이어 붙인다.
 */
export async function PageTitleBanner({
  title,
  description,
  breadcrumb = [],
  actions,
  seed,
  className,
}: {
  title: string
  description?: string | null
  breadcrumb?: BreadcrumbItem[]
  /** 제목 옆(모바일에선 아래)에 붙는 버튼 등 — 예: "스킬 관리" 바로가기 */
  actions?: ReactNode
  seed?: string
  className?: string
}) {
  const art = pickArt(seed ?? title)
  const crumbs = await menuBreadcrumbForRequest(breadcrumb, title)
  const lede = description?.trim() || null

  return (
    <div className={cn("relative overflow-hidden rounded-3xl border bg-muted/30 px-6 py-8 md:px-10 md:py-10", className)}>
      <div aria-hidden className={cn("absolute inset-0", art)} />
      {/* 어떤 그라디언트 조합이 걸려도 브레드크럼·제목이 읽히도록 아래→위 스크림 */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/15" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {crumbs.length > 0 ? (
            <nav
              aria-label="breadcrumb"
              className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            >
              {crumbs.map((item, index) => {
                const current = !item.href && index === crumbs.length - 1
                return (
                  <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                    {index > 0 ? <ChevronRight className="size-3 opacity-50" aria-hidden /> : null}
                    {item.href ? (
                      <Link href={item.href} className="rounded transition-colors hover:text-foreground">
                        {item.label}
                      </Link>
                    ) : (
                      <span className={current ? "text-foreground" : undefined}>{item.label}</span>
                    )}
                  </span>
                )
              })}
            </nav>
          ) : null}
          <h1
            className={cn(
              "font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl",
              crumbs.length > 0 ? "mt-3" : null
            )}
          >
            {title}
          </h1>
          <div className="mt-4 h-1 w-10 rounded-full bg-[hsl(var(--lux-cognac))]" aria-hidden />
          {lede ? <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{lede}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

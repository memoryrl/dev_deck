import type { ReactNode } from "react"
import { ThemedBanner } from "@/components/layout/banners/themed-banner"
import { bannerTeamForRequest } from "@/lib/menus/banner-team"
import { THEME_BANNER_IMAGES } from "@/lib/site/theme-config"
import { menuBreadcrumbForRequest, type BreadcrumbItem } from "@/lib/menus/breadcrumb"

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
  const team = await bannerTeamForRequest(title)
  // 스타일 2 "랜덤" 배경 — 화면을 열 때마다(서버 렌더 때) 하나 뽑아 내려보낸다. 클라이언트에서 뽑으면 하이드레이션이 어긋난다.
  const imageKeys = Object.keys(THEME_BANNER_IMAGES)
  const randomImage = imageKeys[Math.floor(Math.random() * imageKeys.length)]

  return <ThemedBanner title={title} lede={lede} crumbs={crumbs} actions={actions} art={art} team={team} randomImage={randomImage} className={className} />
}

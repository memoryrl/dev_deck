import type { StaticImageData } from "next/image"
import type { LucideIcon } from "lucide-react"
import { Briefcase, Gamepad2, Sparkles, Users } from "lucide-react"
import type { MegaId } from "@/components/layout/public-nav-data"
import { publicMenus } from "@/components/layout/public-nav-data"
import career from "@/public/hero/career.jpg"
import community from "@/public/hero/community.jpg"
import games from "@/public/hero/games.jpg"
import prompt from "@/public/hero/prompt.jpg"

export const HERO_SCENE_INTERVAL_MS = 2000
export const HERO_SCENE_TRANSITION_MS = 700

export type HeroSceneTheme = {
  id: MegaId
  /** 헤더 메가메뉴와 같은 i18n 키 */
  labelKey: string
  /** 카드에 찍는 브랜드 타이틀 (메가 하이라이트와 동일) */
  brand: string
  icon: LucideIcon
  image: StaticImageData
  position: string
  tone: "light" | "dark"
  /** 카드 그라디언트 */
  tint: string
  /** 우측 글로우 액센트 */
  glow: string
}

const ICON: Record<MegaId, LucideIcon> = {
  prompt: Sparkles,
  career: Briefcase,
  games: Gamepad2,
  community: Users,
}

const VISUAL: Record<
  MegaId,
  Pick<HeroSceneTheme, "image" | "position" | "tone" | "tint" | "glow">
> = {
  prompt: {
    image: prompt,
    position: "78% 50%",
    tone: "light",
    tint: "from-[hsl(var(--lux-champagne)/0.42)]",
    glow: "radial-gradient(ellipse at 80% 70%, hsl(var(--lux-champagne) / 0.42), transparent 52%), radial-gradient(ellipse at 90% 100%, hsl(37 40% 61% / 0.18), transparent 48%)",
  },
  career: {
    image: career,
    position: "78% 55%",
    tone: "light",
    tint: "from-[hsl(var(--lux-cognac)/0.34)]",
    glow: "radial-gradient(ellipse at 80% 70%, hsl(var(--lux-cognac) / 0.32), transparent 52%), radial-gradient(ellipse at 90% 100%, hsl(26 30% 32% / 0.16), transparent 48%)",
  },
  games: {
    image: games,
    position: "80% 50%",
    tone: "dark",
    tint: "from-[hsl(var(--lux-espresso)/0.34)]",
    glow: "radial-gradient(ellipse at 80% 70%, hsl(var(--lux-espresso) / 0.35), transparent 52%), radial-gradient(ellipse at 90% 100%, hsl(280 25% 28% / 0.22), transparent 48%)",
  },
  community: {
    image: community,
    position: "78% 48%",
    tone: "light",
    tint: "from-[hsl(214_30%_36%/0.28)]",
    glow: "radial-gradient(ellipse at 80% 70%, hsl(214 30% 36% / 0.28), transparent 52%), radial-gradient(ellipse at 90% 100%, hsl(214 28% 55% / 0.16), transparent 48%)",
  },
}

/** 상단 메가메뉴 순서와 동일 — 배경·카드가 이 순서로 2초마다 함께 순환한다. */
export const HERO_SCENE_THEMES: readonly HeroSceneTheme[] = publicMenus.map((menu) => ({
  id: menu.id,
  labelKey: menu.labelKey,
  brand: menu.highlight.title,
  icon: ICON[menu.id],
  ...VISUAL[menu.id],
}))

export function pickHeroSceneIndex() {
  return Math.floor(Math.random() * HERO_SCENE_THEMES.length)
}

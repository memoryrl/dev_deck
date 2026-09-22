"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePageActivity } from "@/components/landing/use-page-activity"
import {
  HERO_SCENE_INTERVAL_MS,
  HERO_SCENE_THEMES,
  HERO_SCENE_TRANSITION_MS,
  type HeroSceneTheme,
} from "@/lib/landing/hero-themes"

type HeroSceneContextValue = {
  themes: readonly HeroSceneTheme[]
  /** 슬라이드 트랙 인덱스(끝 복제본 포함 가능) */
  index: number
  /** 현재 보이는 테마 */
  theme: HeroSceneTheme
  themeIndex: number
  animate: boolean
  pageActive: boolean
}

const HeroSceneContext = createContext<HeroSceneContextValue | null>(null)

export function HeroSceneProvider({
  initialIndex = 0,
  children,
}: {
  initialIndex?: number
  children: ReactNode
}) {
  const pageActive = usePageActivity()
  const themes = HERO_SCENE_THEMES
  const start = ((initialIndex % themes.length) + themes.length) % themes.length
  const ordered = useMemo(
    () => [...themes.slice(start), ...themes.slice(0, start)],
    [themes, start]
  )
  const [index, setIndex] = useState(0)
  const [animate, setAnimate] = useState(true)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (media.matches || !pageActive || ordered.length < 2) return undefined
    const id = window.setInterval(() => {
      setAnimate(true)
      setIndex((value) => value + 1)
    }, HERO_SCENE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [pageActive, ordered.length])

  useEffect(() => {
    if (index < ordered.length) return undefined
    const id = window.setTimeout(() => {
      setAnimate(false)
      setIndex(0)
    }, HERO_SCENE_TRANSITION_MS)
    return () => window.clearTimeout(id)
  }, [index, ordered.length])

  const themeIndex = Math.min(index, ordered.length - 1)
  const value = useMemo<HeroSceneContextValue>(
    () => ({
      themes: ordered,
      index,
      theme: ordered[themeIndex],
      themeIndex,
      animate,
      pageActive,
    }),
    [ordered, index, themeIndex, animate, pageActive]
  )

  return <HeroSceneContext.Provider value={value}>{children}</HeroSceneContext.Provider>
}

export function useHeroScene() {
  const value = useContext(HeroSceneContext)
  if (!value) throw new Error("useHeroScene must be used within HeroSceneProvider")
  return value
}

"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { usePageActivity } from "@/components/landing/use-page-activity"
import {
  HERO_WALLPAPERS,
  type HeroWallpaper as HeroWallpaperData,
} from "@/lib/landing/hero-wallpapers"
import { cn } from "@/lib/utils"

// 우측 카드 스택(HeroVisual)과 같은 박자·이징으로 맞춘다.
const INTERVAL_MS = 2000
const TRANSITION_MS = 700

function rotateFrom(seed: HeroWallpaperData): HeroWallpaperData[] {
  const start = HERO_WALLPAPERS.findIndex((item) => item.id === seed.id)
  const index = start >= 0 ? start : 0
  return [...HERO_WALLPAPERS.slice(index), ...HERO_WALLPAPERS.slice(0, index)]
}

export function HeroWallpaper({ wallpaper }: { wallpaper: HeroWallpaperData }) {
  const pageActive = usePageActivity()
  const slides = useMemo(() => rotateFrom(wallpaper), [wallpaper])
  // 끝에서 첫 장 복제본으로 한 칸 더 미끄러진 뒤, 애니메이션 없이 0으로 되돌린다.
  const track = useMemo(() => [...slides, slides[0]], [slides])
  const [index, setIndex] = useState(0)
  const [animate, setAnimate] = useState(true)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (media.matches || !pageActive || slides.length < 2) return undefined
    const id = window.setInterval(() => {
      setAnimate(true)
      setIndex((value) => value + 1)
    }, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [pageActive, slides.length])

  useEffect(() => {
    if (index < slides.length) return undefined
    const id = window.setTimeout(() => {
      setAnimate(false)
      setIndex(0)
    }, TRANSITION_MS)
    return () => window.clearTimeout(id)
  }, [index, slides.length])

  const visible = slides[Math.min(index, slides.length - 1)]
  const dark = visible.tone === "dark"

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {track.map((slide, slideIndex) => (
        <div
          key={`${slide.id}-${slideIndex}`}
          className={cn(
            "absolute inset-0",
            animate && "transition-transform duration-700 ease-in-out motion-reduce:transition-none"
          )}
          style={{
            transform: `translate3d(${(slideIndex - index) * 100}%, 0, 0)`,
          }}
        >
          <Image
            src={slide.image}
            alt=""
            fill
            priority={slideIndex === 0}
            placeholder="blur"
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: slide.position }}
          />
        </div>
      ))}

      <div className="absolute inset-0 hidden dark:block dark:bg-background/55" />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b via-55% md:hidden",
          dark
            ? "from-background/95 via-background/70 to-background/10"
            : "from-background/85 via-background/45 to-transparent",
          "dark:from-background/95 dark:via-background/70 dark:to-background/20"
        )}
      />
      <div
        className={cn(
          "absolute inset-0 hidden bg-gradient-to-r via-45% md:block",
          dark
            ? "from-background/95 via-background/60 to-transparent"
            : "from-background/85 via-background/35 to-transparent",
          "dark:from-background/95 dark:via-background/60 dark:to-background/10"
        )}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}

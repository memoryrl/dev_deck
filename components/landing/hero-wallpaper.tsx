"use client"

import Image from "next/image"
import { useHeroScene } from "@/components/landing/hero-scene-context"
import { cn } from "@/lib/utils"

export function HeroWallpaper() {
  const { themes, index, theme, animate } = useHeroScene()
  const track = [...themes, themes[0]]
  const dark = theme.tone === "dark"

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
            // T7/exFAT의 AppleDouble(._*) 때문에 /_next/image 가 빈 응답을 내는
            // 경우가 있어, 히어로 풀블리드 배경은 정적 미디어를 그대로 쓴다.
            unoptimized
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

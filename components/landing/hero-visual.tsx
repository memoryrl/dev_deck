"use client"

import { useHeroScene } from "@/components/landing/hero-scene-context"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

// 앞이 현재 메뉴 테마, 뒤는 직전·그다음 메뉴 — 우측정렬 기준에서 왼쪽으로 펼친다.
const SLOTS = [
  "z-[1] -translate-x-8 translate-y-6 -rotate-[14deg] scale-[0.92]",
  "z-[2] -translate-x-4 translate-y-2 -rotate-[5deg] scale-[0.97]",
  "z-[3] translate-x-0 -translate-y-1 rotate-[7deg] scale-100",
]

export function HeroVisual() {
  const { themes, themeIndex, theme, pageActive } = useHeroScene()
  const { t } = useI18n()
  const count = themes.length

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[18rem] md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[min(52%,38rem)]">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-70 transition-[background-image] duration-700 ease-in-out dark:opacity-50 motion-reduce:transition-none"
          style={{
            backgroundImage: `${theme.glow}, radial-gradient(ellipse at 60% 90%, hsl(var(--lux-sand) / 0.85), transparent 55%)`,
            WebkitMaskImage:
              "linear-gradient(to left, black 28%, transparent 92%), linear-gradient(to top, black 35%, transparent 90%)",
            maskImage:
              "linear-gradient(to left, black 28%, transparent 92%), linear-gradient(to top, black 35%, transparent 90%)",
            WebkitMaskComposite: "source-in",
            maskComposite: "intersect",
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[18rem] md:inset-y-0 md:h-auto">
        <div className="relative mx-auto h-full max-w-6xl px-5">
          <div className="absolute bottom-6 right-5 h-48 w-[16.5rem] sm:w-[20rem] md:bottom-16 md:h-64">
            {themes.map((card, index) => {
              const Icon = card.icon
              // 현재 테마가 맨 앞(slot 2). 직전·다음이 뒤 슬롯.
              const relative = (index - themeIndex + count) % count
              if (relative > 2) return null
              const slot = 2 - relative
              const isFront = slot === 2
              return (
                <div
                  key={card.id}
                  className={cn(
                    "absolute bottom-0 right-0 h-36 w-28 rounded-2xl bg-gradient-to-br to-background/80 shadow-[0_18px_40px_-18px_hsl(var(--foreground)/0.35)] ring-1 ring-foreground/10 backdrop-blur-md transition-transform duration-700 ease-in-out motion-reduce:transition-none md:h-44 md:w-32",
                    card.tint,
                    SLOTS[slot]
                  )}
                >
                  <div className="relative z-10 flex h-full flex-col justify-between p-3.5">
                    <Icon className="size-4 text-foreground/70" />
                    <div>
                      <p className="font-display text-xs font-bold tracking-tight">{card.brand}</p>
                      <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{t(card.labelKey)}</p>
                    </div>
                  </div>
                  {isFront ? (
                    <span
                      aria-hidden
                      data-paused={pageActive ? undefined : ""}
                      className="hero-card-beam absolute inset-0 z-20 rounded-2xl motion-reduce:hidden"
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

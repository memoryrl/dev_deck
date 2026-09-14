"use client"

import { useEffect, useState } from "react"
import { Briefcase, Gamepad2, Sparkles } from "lucide-react"
import { usePageActivity } from "@/components/landing/use-page-activity"
import { cn } from "@/lib/utils"

const cards = [
  { title: "PromptKit", icon: Sparkles, tint: "from-[hsl(var(--lux-champagne)/0.42)]" },
  { title: "CareerLog", icon: Briefcase, tint: "from-[hsl(var(--lux-cognac)/0.32)]" },
  { title: "Steam", icon: Gamepad2, tint: "from-[hsl(var(--lux-espresso)/0.28)]" },
]

const SLOTS = [
  "z-[1] -translate-x-3 translate-y-6 -rotate-[14deg] scale-[0.92]",
  "z-[2] translate-y-2 -rotate-[5deg] scale-[0.97]",
  "z-[3] translate-x-2 -translate-y-1 rotate-[7deg] scale-100",
]

export function HeroVisual() {
  const [offset, setOffset] = useState(0)
  const pageActive = usePageActivity()

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (media.matches || !pageActive) return undefined
    const id = window.setInterval(() => {
      setOffset((value) => (value + 1) % cards.length)
    }, 2000)
    return () => window.clearInterval(id)
  }, [pageActive])

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[18rem] md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[min(52%,38rem)]">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-70 dark:opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 80% 70%, hsl(var(--lux-champagne) / 0.38), transparent 52%), radial-gradient(ellipse at 90% 100%, hsl(var(--lux-cognac) / 0.2), transparent 48%), radial-gradient(ellipse at 60% 90%, hsl(var(--lux-sand) / 0.85), transparent 55%)",
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
          <div className="absolute bottom-6 right-5 flex h-48 w-[16.5rem] items-end justify-center sm:w-[20rem] md:bottom-16 md:h-64">
            {cards.map((card, index) => {
              const Icon = card.icon
              const slot = (index + offset) % SLOTS.length
              return (
                <div
                  key={card.title}
                  className={cn(
                    "absolute h-36 w-28 rounded-2xl bg-gradient-to-br to-background/80 shadow-[0_18px_40px_-18px_hsl(var(--foreground)/0.35)] ring-1 ring-foreground/10 backdrop-blur-md transition-transform duration-700 ease-in-out motion-reduce:transition-none md:h-44 md:w-32",
                    card.tint,
                    SLOTS[slot]
                  )}
                >
                  <div className="flex h-full flex-col justify-between p-3.5">
                    <Icon className="size-4 text-foreground/70" />
                    <p className="font-display text-xs font-bold tracking-tight">{card.title}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

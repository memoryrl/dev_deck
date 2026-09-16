"use client"

import Link from "next/link"
import { Briefcase, Gamepad2, Sparkles } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { usePageActivity } from "@/components/landing/use-page-activity"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const MODULE_META = [
  {
    href: "/#prompts",
    title: "PromptKit",
    bodyKey: "landing.modulePrompt",
    icon: Sparkles,
    tint: "from-[hsl(var(--lux-champagne)/0.18)]",
  },
  {
    href: "/work",
    title: "CareerLog",
    bodyKey: "landing.moduleCareer",
    icon: Briefcase,
    tint: "from-[hsl(var(--lux-cognac)/0.14)]",
  },
  {
    href: "/games",
    title: "Steam Tracker",
    bodyKey: "landing.moduleSteam",
    icon: Gamepad2,
    tint: "from-[hsl(var(--lux-espresso)/0.1)]",
  },
] as const

function ModuleCard({
  href,
  title,
  body,
  icon: Icon,
  tint,
  className,
}: {
  href: string
  title: string
  body: string
  icon: (typeof MODULE_META)[number]["icon"]
  tint: string
  className?: string
}) {
  return (
    <Link href={href} className={cn("w-[min(22rem,78vw)] shrink-0", className)}>
      <Card className={`h-full overflow-hidden bg-gradient-to-br ${tint} to-card transition hover:-translate-y-0.5`}>
        <Icon className="size-5 text-foreground/70" />
        <h2 className="mt-4 font-display text-2xl font-extrabold">{title}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{body}</p>
      </Card>
    </Link>
  )
}

export function ModuleMarquee() {
  const { t } = useI18n()
  const modules = MODULE_META.map((mod) => ({ ...mod, body: t(mod.bodyKey) }))
  const loop = [...modules, ...modules]
  const pageActive = usePageActivity()

  return (
    <section className="relative overflow-x-clip py-14">
      <div className="mx-auto grid max-w-6xl gap-4 px-5 md:hidden">
        {modules.map((mod) => (
          <ModuleCard key={mod.title} {...mod} className="w-full" />
        ))}
      </div>
      <div className="group relative hidden overflow-hidden md:block">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
        <div
          className="flex w-max max-w-none gap-4 pr-4 motion-safe:animate-marquee motion-safe:group-hover:[animation-play-state:paused]"
          style={{ animationPlayState: pageActive ? undefined : "paused" }}
        >
          {loop.map((mod, index) => (
            <ModuleCard key={`${mod.title}-${index}`} {...mod} />
          ))}
        </div>
      </div>
    </section>
  )
}

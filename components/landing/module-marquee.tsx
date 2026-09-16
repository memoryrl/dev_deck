"use client"

import Link from "next/link"
import { BookOpen, Briefcase, Compass, Gamepad2, Sparkles, Users } from "lucide-react"
import { usePageActivity } from "@/components/landing/use-page-activity"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { TopologyModuleNode } from "@/lib/landing/topology"

// 메뉴 DB에는 아이콘·색상 정보가 없다 — 카드 순서대로 이 팔레트를 순환시켜 고정
// 배정한다(같은 메뉴는 항상 같은 아이콘/색). 배경은 서로 다른 웜 톤으로 한눈에
// 구분되게 두고, 페이지 크림색(`bg-card`)에 녹지 않을 만큼만 채도를 올린다.
const CARD_STYLE = [
  {
    icon: Sparkles,
    surface:
      "bg-[hsl(37_48%_91%)] border-[hsl(37_36%_58%/0.42)] dark:bg-[hsl(var(--lux-champagne)/0.16)] dark:border-[hsl(var(--lux-champagne)/0.35)]",
    iconClass: "text-[hsl(32_40%_36%)] dark:text-[hsl(var(--lux-champagne))]",
  },
  {
    icon: Briefcase,
    surface:
      "bg-[hsl(20_38%_90%)] border-[hsl(22_30%_46%/0.38)] dark:bg-[hsl(var(--lux-cognac)/0.22)] dark:border-[hsl(var(--lux-cognac)/0.4)]",
    iconClass: "text-[hsl(20_34%_34%)] dark:text-[hsl(26_40%_72%)]",
  },
  {
    icon: Gamepad2,
    surface:
      "bg-[hsl(155_22%_90%)] border-[hsl(155_16%_40%/0.34)] dark:bg-[hsl(155_14%_18%)] dark:border-[hsl(155_16%_40%/0.4)]",
    iconClass: "text-[hsl(155_24%_30%)] dark:text-[hsl(155_28%_68%)]",
  },
  {
    icon: Users,
    surface:
      "bg-[hsl(214_30%_91%)] border-[hsl(214_24%_48%/0.32)] dark:bg-[hsl(214_18%_18%)] dark:border-[hsl(214_22%_42%/0.4)]",
    iconClass: "text-[hsl(214_30%_36%)] dark:text-[hsl(214_32%_72%)]",
  },
  {
    icon: BookOpen,
    surface:
      "bg-[hsl(350_32%_92%)] border-[hsl(350_24%_52%/0.32)] dark:bg-[hsl(350_18%_18%)] dark:border-[hsl(350_22%_42%/0.4)]",
    iconClass: "text-[hsl(350_30%_38%)] dark:text-[hsl(350_32%_72%)]",
  },
  {
    icon: Compass,
    surface:
      "bg-[hsl(45_28%_90%)] border-[hsl(40_18%_48%/0.34)] dark:bg-[hsl(40_12%_18%)] dark:border-[hsl(40_16%_42%/0.4)]",
    iconClass: "text-[hsl(32_22%_34%)] dark:text-[hsl(40_24%_72%)]",
  },
] as const

export type ModuleMarqueeItem = Pick<TopologyModuleNode, "id" | "label" | "href" | "guideDescription">

function ModuleCard({
  href,
  title,
  body,
  index,
  icon: Icon,
  surface,
  iconClass,
  className,
}: {
  href: string
  title: string
  body: string
  index: number
  icon: (typeof CARD_STYLE)[number]["icon"]
  surface: string
  iconClass: string
  className?: string
}) {
  const number = String(index + 1).padStart(2, "0")
  return (
    <Link href={href} className={cn("w-[min(22rem,78vw)] shrink-0", className)}>
      <Card className={cn("h-full overflow-hidden transition hover:-translate-y-0.5", surface)}>
        <Icon className={cn("size-5", iconClass)} />
        <h2 className="mt-4 flex items-baseline gap-2.5 font-display text-2xl font-extrabold">
          <span className="text-base font-bold tabular-nums tracking-tight text-muted-foreground" aria-hidden>
            {number}
          </span>
          <span>{title}</span>
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">{body}</p>
      </Card>
    </Link>
  )
}

export function ModuleMarquee({ modules }: { modules: ModuleMarqueeItem[] }) {
  const cards = modules.map((mod, index) => ({
    id: mod.id,
    href: mod.href,
    title: mod.label,
    body: mod.guideDescription,
    index,
    ...CARD_STYLE[index % CARD_STYLE.length],
  }))
  const loop = [...cards, ...cards]
  const pageActive = usePageActivity()

  if (cards.length === 0) return null

  return (
    <section className="relative mx-auto max-w-6xl overflow-x-clip px-5 py-14">
      <div className="grid gap-4 md:hidden">
        {cards.map((card) => (
          <ModuleCard key={card.id} {...card} className="w-full" />
        ))}
      </div>
      <div className="group relative hidden overflow-hidden md:block">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
        <div
          className="flex w-max max-w-none gap-4 pr-4 motion-safe:animate-marquee motion-safe:group-hover:[animation-play-state:paused]"
          style={{ animationPlayState: pageActive ? undefined : "paused" }}
        >
          {loop.map((card, index) => (
            <ModuleCard key={`${card.id}-${index}`} {...card} />
          ))}
        </div>
      </div>
    </section>
  )
}

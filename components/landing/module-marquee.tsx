"use client"

import Link from "next/link"
import { Briefcase, Gamepad2, Sparkles } from "lucide-react"
import { usePageActivity } from "@/components/landing/use-page-activity"
import { Card } from "@/components/ui/card"

const modules = [
  {
    href: "/#prompts",
    title: "PromptKit",
    body: "바이브 코딩 프롬프트를 저장하고 한 번에 복사합니다.",
    icon: Sparkles,
    tint: "from-[hsl(var(--lux-champagne)/0.18)]",
  },
  {
    href: "/work",
    title: "CareerLog",
    body: "참여 프로젝트와 스킬을 게시판·블로그로 정리합니다.",
    icon: Briefcase,
    tint: "from-[hsl(var(--lux-cognac)/0.14)]",
  },
  {
    href: "/games",
    title: "Steam Tracker",
    body: "보유 게임과 리뷰를 공개 포트폴리오로 보여 줍니다.",
    icon: Gamepad2,
    tint: "from-[hsl(var(--lux-espresso)/0.1)]",
  },
]

function ModuleCard({
  href,
  title,
  body,
  icon: Icon,
  tint,
}: (typeof modules)[number]) {
  return (
    <Link href={href} className="w-[min(22rem,78vw)] shrink-0">
      <Card className={`h-full overflow-hidden bg-gradient-to-br ${tint} to-card transition hover:-translate-y-0.5`}>
        <Icon className="size-5 text-foreground/70" />
        <h2 className="mt-4 font-display text-2xl font-extrabold">{title}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{body}</p>
      </Card>
    </Link>
  )
}

export function ModuleMarquee() {
  const loop = [...modules, ...modules]
  const pageActive = usePageActivity()

  return (
    <section className="relative overflow-hidden py-14">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <div className="group">
        <div
          className="flex w-max gap-4 pr-4 motion-safe:animate-marquee motion-safe:group-hover:[animation-play-state:paused]"
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

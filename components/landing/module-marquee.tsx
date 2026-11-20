import Link from "next/link"
import { BookOpen, Briefcase, Compass, Gamepad2, Sparkles, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { TopologyModuleNode } from "@/lib/landing/topology"

// 메뉴 DB에는 아이콘 정보가 없다 — 카드 순서대로 순환 배정한다(같은 메뉴는 항상 같은 아이콘).
const CARD_ICONS = [Sparkles, Briefcase, Gamepad2, Users, BookOpen, Compass] as const

export type ModuleMarqueeItem = Pick<TopologyModuleNode, "id" | "label" | "href" | "guideDescription">

function ModuleCard({
  href,
  title,
  body,
  icon: Icon,
}: {
  href: string
  title: string
  body: string
  icon: (typeof CARD_ICONS)[number]
}) {
  return (
    <Link href={href} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full border-foreground/10 transition-colors group-hover:border-foreground/20 group-hover:bg-muted/40">
        <Icon className="size-[18px] text-muted-foreground" strokeWidth={1.5} aria-hidden />
        <h2 className="mt-4 font-display text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </Card>
    </Link>
  )
}

export function ModuleMarquee({ modules }: { modules: ModuleMarqueeItem[] }) {
  if (modules.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <div className={`grid gap-4 sm:grid-cols-2 ${modules.length % 3 === 0 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        {modules.map((mod, index) => (
          <ModuleCard
            key={mod.id}
            href={mod.href}
            title={mod.label}
            body={mod.guideDescription}
            icon={CARD_ICONS[index % CARD_ICONS.length]}
          />
        ))}
      </div>
    </section>
  )
}

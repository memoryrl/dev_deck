import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/components/landing/scroll-reveal"
import { getT } from "@/lib/i18n/dictionary"
import type { CareerSkill } from "@/types/career"

const SHOW = 8

export async function SkillShowcase({ skills }: { skills: CareerSkill[] }) {
  if (skills.length === 0) return null
  const { t } = await getT()
  const items = skills.slice(0, SHOW)

  return (
    <section id="skills" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-8">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold md:text-3xl">{t("landing.skills")}</h2>
        <Link href="/work" className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline">
          {t("common.more")}
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((skill, index) => (
          <ScrollReveal key={skill.id} variant="up" delay={(index % 4) * 90} duration={550}>
            <Link href="/work" className="block h-full rounded-2xl border border-foreground/10 bg-card p-5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-medium">{skill.name}</h3>
                {skill.proficiency ? <Badge variant="secondary">{skill.proficiency}</Badge> : null}
              </div>
              {skill.years != null ? (
                <p className="mt-1 text-xs text-muted-foreground">{t("common.years", { count: skill.years })}</p>
              ) : null}
              {skill.summary ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{skill.summary}</p>
              ) : null}
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}

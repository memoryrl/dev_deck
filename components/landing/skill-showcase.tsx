import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { CareerSkill } from "@/types/career"

const SHOW = 8

export function SkillShowcase({ skills }: { skills: CareerSkill[] }) {
  if (skills.length === 0) return null
  const items = skills.slice(0, SHOW)

  return (
    <section id="skills" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-8">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-3xl font-extrabold">스킬</h2>
        <Link href="/work" className="text-sm font-semibold underline">
          더 보기
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((skill) => (
          <Link
            key={skill.id}
            href="/work"
            className="rounded-2xl border bg-card p-4 transition hover:bg-muted/40"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-bold">{skill.name}</h3>
              {skill.proficiency ? <Badge variant="secondary">{skill.proficiency}</Badge> : null}
            </div>
            {skill.years != null ? (
              <p className="mt-1 text-xs text-muted-foreground">{skill.years}년</p>
            ) : null}
            {skill.summary ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{skill.summary}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  )
}

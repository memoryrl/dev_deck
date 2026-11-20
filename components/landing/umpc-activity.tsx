import Link from "next/link"
import { Briefcase, Gamepad2, Sparkles, Star } from "lucide-react"
import { ScrollReveal } from "@/components/landing/scroll-reveal"
import { getT } from "@/lib/i18n/dictionary"
import { formatLastPlayed } from "@/lib/i18n/format"
import { cn } from "@/lib/utils"
import type { HomeActivityItem, HomeActivityKind } from "@/lib/landing/home"

const ACTIVITY_ICON: Record<HomeActivityKind, typeof Sparkles> = {
  prompt: Sparkles,
  career: Briefcase,
  review: Star,
}

export async function UmpcActivity({
  umpc,
  activity,
}: {
  umpc: { href: string; title: string; body: string } | null
  activity: HomeActivityItem[]
}) {
  const { t, dictionary } = await getT()
  const rows = activity

  if (!umpc && rows.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-5 pb-16">
      <div className={cn("grid gap-4", umpc && rows.length > 0 && "md:grid-cols-2")}>
        {umpc ? (
          <ScrollReveal variant="left" duration={600}>
            <Link
              href={umpc.href}
              className="block rounded-2xl border border-foreground/10 bg-card p-6 transition-colors hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Gamepad2 className="size-4" strokeWidth={1.5} aria-hidden />
                UMPC / Deck
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold">{umpc.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{umpc.body}</p>
            </Link>
          </ScrollReveal>
        ) : null}
        {rows.length > 0 ? (
          <ScrollReveal variant="right" delay={100} duration={600}>
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("landing.recentActivity")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("landing.recentActivityLede")}</p>
                </div>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {t("landing.recentActivityCount", { count: rows.length })}
                </span>
              </div>
              <div className="mt-4 rounded-2xl border bg-card px-6 py-2">
                <ul>
                  {rows.map((row) => {
                    const Icon = ACTIVITY_ICON[row.kind]
                    return (
                      <li
                        key={`${row.kind}-${row.href}`}
                        className="border-t border-border/70 py-5 first:border-t-0"
                      >
                        <Link href={row.href} className="group flex items-start gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <span
                            className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground"
                          >
                            <Icon className="size-4" aria-hidden strokeWidth={1.5} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-3">
                              <span className="text-xs font-medium text-muted-foreground">
                                {row.label}
                              </span>
                              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                {formatLastPlayed(row.at, dictionary)}
                              </span>
                            </span>
                            <span className="mt-1 block truncate font-display text-base font-medium underline-offset-4 group-hover:underline">
                              {row.title}
                            </span>
                            {row.detail ? (
                              <span className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                                {row.detail}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </ScrollReveal>
        ) : null}
      </div>
    </section>
  )
}

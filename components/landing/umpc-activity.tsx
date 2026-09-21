import Link from "next/link"
import { Briefcase, Gamepad2, Sparkles, Star } from "lucide-react"
import { ScrollReveal } from "@/components/landing/scroll-reveal"
import { getT } from "@/lib/i18n/dictionary"
import { formatLastPlayed } from "@/lib/i18n/format"
import { cn } from "@/lib/utils"
import type { HomeActivityItem, HomeActivityKind } from "@/lib/landing/home"

const ACTIVITY_ICON: Record<
  HomeActivityKind,
  { icon: typeof Sparkles; className: string }
> = {
  prompt: { icon: Sparkles, className: "text-[hsl(var(--lux-champagne))]" },
  career: { icon: Briefcase, className: "text-[hsl(var(--lux-cognac))]" },
  review: { icon: Star, className: "text-[hsl(28_55%_48%)]" },
}

export function UmpcActivity({
  umpc,
  activity,
}: {
  umpc: { href: string; title: string; body: string } | null
  activity: HomeActivityItem[]
}) {
  const { t, dictionary } = getT()
  const rows = activity

  if (!umpc && rows.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-5 pb-16">
      <div className={cn("grid gap-4", umpc && rows.length > 0 && "md:grid-cols-2")}>
        {umpc ? (
          <ScrollReveal variant="left" duration={600}>
            <Link
              href={umpc.href}
              className="block rounded-2xl border bg-gradient-to-br from-[hsl(var(--lux-espresso)/0.12)] to-card p-6 transition hover:-translate-y-0.5"
            >
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Gamepad2 className="size-3.5" />
                UMPC / Deck
              </p>
              <h2 className="mt-3 font-display text-2xl font-extrabold">{umpc.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{umpc.body}</p>
            </Link>
          </ScrollReveal>
        ) : null}
        {rows.length > 0 ? (
          <ScrollReveal variant="right" delay={100} duration={600}>
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">{t("landing.recentActivity")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("landing.recentActivityLede")}</p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {t("landing.recentActivityCount", { count: rows.length })}
                </span>
              </div>
              <div className="mt-4 rounded-2xl border bg-card px-6 py-2">
                <ul>
                  {rows.map((row) => {
                    const meta = ACTIVITY_ICON[row.kind]
                    const Icon = meta.icon
                    return (
                      <li
                        key={`${row.kind}-${row.href}`}
                        className="border-t border-border/70 py-5 first:border-t-0"
                      >
                        <Link href={row.href} className="group flex items-start gap-3 transition-colors">
                          <span
                            className={cn(
                              "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/70 ring-1 ring-foreground/5",
                              meta.className
                            )}
                          >
                            <Icon className="size-4 opacity-90" aria-hidden strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-3">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {row.label}
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatLastPlayed(row.at, dictionary)}
                              </span>
                            </span>
                            <span className="mt-1 block truncate font-display text-base font-bold tracking-tight group-hover:underline">
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

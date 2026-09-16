import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getT } from "@/lib/i18n/dictionary"
import type { FeaturedWork } from "@/lib/landing/home"

export function FeaturedWorkCard({ work }: { work: FeaturedWork | null }) {
  if (!work) return null
  const { t } = getT()

  return (
    <section className="mx-auto max-w-6xl px-5 pb-4 pt-4">
      <p className="text-sm font-semibold text-muted-foreground">{t("landing.featured")}</p>
      <Link
        href={work.href}
        className="group mt-4 block overflow-hidden rounded-2xl border bg-gradient-to-br from-[hsl(var(--lux-champagne)/0.16)] to-card p-6 shadow-sm transition hover:-translate-y-0.5 md:p-8"
      >
        <Badge>{work.badge}</Badge>
        <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight md:text-4xl">{work.title}</h2>
        {work.meta ? <p className="mt-2 text-sm text-muted-foreground">{work.meta}</p> : null}
        {work.excerpt ? (
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">{work.excerpt}</p>
        ) : null}
        <p className="mt-6 inline-flex items-center gap-1 text-sm font-semibold">
          {t("landing.readMore")}
          <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </p>
      </Link>
    </section>
  )
}

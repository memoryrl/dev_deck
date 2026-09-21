import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollReveal } from "@/components/landing/scroll-reveal"
import { getT } from "@/lib/i18n/dictionary"
import type { FeaturedWork } from "@/lib/landing/home"

export async function FeaturedWorkCard({ work }: { work: FeaturedWork | null }) {
  if (!work) return null
  const { t } = await getT()
  const thumb = work.thumbnailUrl?.trim()

  return (
    <section className="mx-auto max-w-6xl px-5 pb-4 pt-4">
      <p className="text-sm font-semibold text-muted-foreground">{t("landing.featured")}</p>
      <Link
        href={work.href}
        className="group mt-4 block overflow-hidden rounded-2xl border bg-gradient-to-br from-[hsl(var(--lux-champagne)/0.16)] to-card shadow-sm transition hover:-translate-y-0.5"
      >
        <div className="flex flex-col-reverse md:flex-row">
          <ScrollReveal variant="up" delay={160} className="min-w-0 flex-1">
            <div className="p-6 md:p-8">
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
            </div>
          </ScrollReveal>
          {thumb ? (
            <ScrollReveal
              variant="scale"
              duration={800}
              className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted md:aspect-auto md:min-h-[14rem] md:w-[min(46%,26rem)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb}
                alt=""
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </ScrollReveal>
          ) : null}
        </div>
      </Link>
    </section>
  )
}

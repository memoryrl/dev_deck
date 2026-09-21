import { Github, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getT } from "@/lib/i18n/dictionary"
import { SITE_CONTACT } from "@/lib/site/profile"

export async function ContactCta() {
  const { t } = await getT()
  return (
    <section id="contact" className="mx-auto max-w-6xl px-5 pb-20 pt-8">
      <div className="dark relative overflow-hidden rounded-2xl border bg-[hsl(24_14%_11%)] text-card-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[hsl(var(--lux-champagne)/0.28)] via-transparent to-[hsl(var(--lux-cognac)/0.22)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[radial-gradient(circle,hsl(var(--lux-champagne)/0.38),transparent_68%)] blur-2xl"
        />
        <div className="relative flex flex-col gap-8 p-7 md:flex-row md:items-end md:justify-between md:p-10">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-muted-foreground">
              {t("landing.role")}
              <span className="mx-2 text-border">·</span>
              {t("landing.name")}
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              {t("landing.ctaTitle")}
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              <p>{t("landing.intro1")}</p>
              <p>{t("landing.intro2")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="lg">
              <a href={SITE_CONTACT.github} target="_blank" rel="noreferrer">
                <Github />
                {SITE_CONTACT.githubLabel}
              </a>
            </Button>
            <Button asChild size="lg">
              <a href={`mailto:${SITE_CONTACT.email}`}>
                <Mail />
                {t("landing.sendMail")}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

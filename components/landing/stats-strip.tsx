import { Briefcase, Gamepad2, Sparkles, Star } from "lucide-react"
import { getT } from "@/lib/i18n/dictionary"
import { formatPlaytime } from "@/lib/utils"

export async function StatsStrip({
  promptCount,
  careerCount,
  gameCount,
  playtimeMinutes,
  reviewCount,
}: {
  promptCount: number
  careerCount: number
  gameCount: number
  playtimeMinutes: number
  reviewCount: number
}) {
  const { t } = await getT()
  const items = [
    {
      label: t("landing.statsPrompts"),
      value: String(promptCount),
      icon: Sparkles,
      iconClass: "text-[hsl(var(--lux-champagne))]",
    },
    {
      label: t("landing.statsCareer"),
      value: String(careerCount),
      icon: Briefcase,
      iconClass: "text-[hsl(var(--lux-cognac))]",
    },
    {
      label: t("landing.statsGames"),
      value: String(gameCount),
      note: playtimeMinutes > 0 ? t("landing.statsPlaytime", { time: formatPlaytime(playtimeMinutes) }) : null,
      icon: Gamepad2,
      iconClass: "text-[hsl(var(--lux-espresso))]",
    },
    {
      label: t("landing.statsReviews"),
      value: String(reviewCount),
      icon: Star,
      iconClass: "text-[hsl(28_55%_48%)]",
    },
  ]

  return (
    <section className="mx-auto max-w-6xl px-5 pb-6 pt-10">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="rounded-2xl border bg-card px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="font-display text-3xl font-extrabold tabular-nums">{item.value}</p>
                <Icon className={`size-7 shrink-0 opacity-80 ${item.iconClass}`} aria-hidden strokeWidth={1.75} />
              </div>
              {item.note ? <p className="mt-1 text-xs text-muted-foreground">{item.note}</p> : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

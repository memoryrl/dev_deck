import { getT } from "@/lib/i18n/dictionary"
import { formatPlaytime } from "@/lib/utils"

export function StatsStrip({
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
  const { t } = getT()
  const items = [
    { label: t("landing.statsPrompts"), value: String(promptCount) },
    { label: t("landing.statsCareer"), value: String(careerCount) },
    {
      label: t("landing.statsGames"),
      value: String(gameCount),
      note: playtimeMinutes > 0 ? t("landing.statsPlaytime", { time: formatPlaytime(playtimeMinutes) }) : null,
    },
    { label: t("landing.statsReviews"), value: String(reviewCount) },
  ]

  return (
    <section className="mx-auto max-w-6xl px-5 pb-6 pt-10">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border bg-card px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="mt-2 font-display text-3xl font-extrabold tabular-nums">{item.value}</p>
            {item.note ? <p className="mt-1 text-xs text-muted-foreground">{item.note}</p> : null}
          </div>
        ))}
      </div>
    </section>
  )
}

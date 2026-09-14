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
  const items = [
    { label: "공개 프롬프트", value: String(promptCount) },
    { label: "커리어 글", value: String(careerCount) },
    {
      label: "보유 게임",
      value: String(gameCount),
      note: playtimeMinutes > 0 ? `누적 ${formatPlaytime(playtimeMinutes)}` : null,
    },
    { label: "공개 리뷰", value: String(reviewCount) },
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

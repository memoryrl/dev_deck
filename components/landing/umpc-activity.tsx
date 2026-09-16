import Link from "next/link"
import { Gamepad2 } from "lucide-react"
import { getT } from "@/lib/i18n/dictionary"
import { formatLastPlayed } from "@/lib/i18n/format"
import { cn } from "@/lib/utils"

export function UmpcActivity({
  umpc,
  activity,
}: {
  umpc: { href: string; title: string; body: string } | null
  activity: { promptAt: string | null; careerAt: string | null; reviewAt: string | null }
}) {
  const { t, dictionary } = getT()
  const rows = [
    { label: t("landing.badgePrompt"), at: activity.promptAt, href: "/#prompts" },
    { label: t("footer.career"), at: activity.careerAt, href: "/work" },
    { label: t("footer.reviews"), at: activity.reviewAt, href: "/#games" },
  ].filter((row) => row.at)

  if (!umpc && rows.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-5 pb-10">
      <div className={cn("grid gap-4", umpc && rows.length > 0 && "md:grid-cols-2")}>
        {umpc ? (
          <Link
            href={umpc.href}
            className="rounded-2xl border bg-gradient-to-br from-[hsl(var(--lux-espresso)/0.12)] to-card p-6 transition hover:-translate-y-0.5"
          >
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Gamepad2 className="size-3.5" />
              UMPC / Deck
            </p>
            <h2 className="mt-3 font-display text-2xl font-extrabold">{umpc.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{umpc.body}</p>
          </Link>
        ) : null}
        {rows.length > 0 ? (
          <div className="rounded-2xl border bg-card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("landing.recentActivity")}
            </p>
            <ul className="mt-4 space-y-3">
              {rows.map((row) => (
                <li key={row.label}>
                  <Link href={row.href} className="flex items-baseline justify-between gap-3 hover:underline">
                    <span className="text-sm font-semibold">{row.label}</span>
                    <span className="text-sm text-muted-foreground">{formatLastPlayed(row.at, dictionary)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}

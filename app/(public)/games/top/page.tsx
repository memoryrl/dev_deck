import Link from "next/link"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { PublicContainer } from "@/components/layout/public-container"
import { PodiumPanel } from "@/components/games/podium-topology/podium-panel"
import { SteamCover } from "@/components/steam/steam-cover"
import { getT } from "@/lib/i18n/dictionary"
import { steamCoverSources } from "@/lib/steam/images"
import { getTopSteamGames, type PodiumEntry } from "@/lib/steam/top"
import { cn } from "@/lib/utils"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"

const MEDAL_TONE = ["border-[#d4af37] bg-[#fff6d8]", "border-[#9aa3b0] bg-[#eef1f5]", "border-[#b87333] bg-[#f4e3d1]"]

export default async function GamesTopPage() {
  const { t } = await getT()
  const entries = await getTopSteamGames().catch(() => [] as PodiumEntry[])

  return (
    <PublicContainer>
      <PageTitleBanner title={t("games.topTitle")} description={t("games.topDescription")} />

      {entries.length === 0 ? (
        <EmptyPlaceholder className="mt-8">{t("games.topEmpty")}</EmptyPlaceholder>
      ) : (
        <>
          <div className="mt-8 overflow-hidden rounded-3xl border border-foreground/10 shadow-[0_24px_60px_-36px_hsl(24_20%_10%/0.55)]">
            <PodiumPanel entries={entries} />
          </div>

          <ol className="mt-8 grid gap-3 sm:grid-cols-2">
            {entries.map((entry) => (
              <li key={entry.appId}>
                <Link
                  href={`/games/${entry.appId}`}
                  className={cn(
                    "flex overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-md",
                    entry.rank <= 3 ? MEDAL_TONE[entry.rank - 1] : "border-border"
                  )}
                >
                  <SteamCover
                    src={steamCoverSources(entry.appId, entry.headerImageUrl)}
                    appId={entry.appId}
                    alt=""
                    className="h-20 w-32 shrink-0 sm:h-24 sm:w-40"
                  />
                  <span className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-black",
                        entry.rank === 1 && "bg-[#f4c430] text-[#1a1614]",
                        entry.rank === 2 && "bg-[#c5ccd6] text-[#1a1614]",
                        entry.rank === 3 && "bg-[#cd7f32] text-[#1a1614]",
                        entry.rank > 3 && "bg-foreground text-background"
                      )}
                    >
                      {entry.rank}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{entry.name}</span>
                      <span className="text-xs text-muted-foreground">{entry.playtimeLabel}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </PublicContainer>
  )
}

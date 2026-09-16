"use client"

import { useState } from "react"
import Link from "next/link"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"
import { plainTextFromContent } from "@/lib/content"
import { SteamCover } from "@/components/steam/steam-cover"
import { TwoWeekBadge } from "@/components/steam/two-week-badge"
import { steamCoverSources } from "@/lib/steam/images"
import { cn, formatPlaytime } from "@/lib/utils"
import { formatLastPlayed } from "@/lib/i18n/format"
import { useI18n } from "@/components/i18n/i18n-provider"
import type { FeaturedGame } from "@/components/landing/steam-featured"
import type { GameReview, SteamProfile } from "@/types/steam"

type Tab = "rank" | "recent"

function RankMark({ rank, className }: { rank: number; className?: string }) {
  return (
    <span
      className={cn(
        "absolute left-2.5 top-2.5 z-10 flex items-center justify-center rounded-full bg-background/80 font-display tabular-nums backdrop-blur-sm",
        className
      )}
    >
      {String(rank).padStart(2, "0")}
    </span>
  )
}

function GameMeta({ game, kind }: { game: FeaturedGame; kind: "rank" | "recent" }) {
  const { dictionary } = useI18n()
  if (kind === "recent") {
    const lastPlayed = formatLastPlayed(game.last_played_at, dictionary)
    return lastPlayed ? <span className="shrink-0 text-xs text-white/80 md:text-sm">{lastPlayed}</span> : null
  }
  if (game.playtime_forever_minutes > 0) {
    return (
      <span className="shrink-0 text-xs text-white/80 md:text-sm">
        {formatPlaytime(game.playtime_forever_minutes)}
      </span>
    )
  }
  return null
}

function ShowcaseGrid({ games, kind }: { games: FeaturedGame[]; kind: "rank" | "recent" }) {
  const { t, dictionary } = useI18n()
  const [lead, ...rest] = games
  const side = rest.slice(0, 4)
  if (!lead) {
    return (
      <EmptyPlaceholder>
        {kind === "recent" ? t("steam.emptyRecent") : t("steam.emptyRank")}
      </EmptyPlaceholder>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:grid-rows-2">
      <Link
        href={`/games/${lead.app_id}`}
        className="group relative flex h-full min-h-96 flex-col overflow-hidden rounded-2xl bg-[#171a21] md:row-span-2"
      >
        <SteamCover
          src={steamCoverSources(lead.app_id, lead.header_image_url)}
          appId={lead.app_id}
          alt=""
          className="h-96 w-full md:absolute md:inset-0 md:h-full"
        />
        <RankMark rank={1} className="h-10 w-10 text-sm font-extrabold" />
        <TwoWeekBadge minutes={lead.playtime_2weeks_minutes} />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-4 pt-16 text-white">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-xl font-bold leading-tight">{lead.name}</h3>
            </div>
            <GameMeta game={lead} kind={kind} />
          </div>
        </div>
      </Link>
      {side.map((game, index) => (
        <Link
          key={game.app_id}
          href={`/games/${game.app_id}`}
          className="group overflow-hidden rounded-2xl border bg-card shadow-sm"
        >
          <div className="relative">
            <SteamCover
              src={steamCoverSources(game.app_id, game.header_image_url)}
              appId={game.app_id}
              alt=""
              className="h-48 w-full"
            />
            <RankMark rank={index + 2} className="h-8 w-8 text-xs font-bold" />
            <TwoWeekBadge minutes={game.playtime_2weeks_minutes} />
          </div>
          <div className="flex items-end justify-between gap-3 p-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-sm font-bold">{game.name}</h3>
            </div>
            {kind === "recent" ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatLastPlayed(game.last_played_at, dictionary)}
              </span>
            ) : game.playtime_forever_minutes > 0 ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatPlaytime(game.playtime_forever_minutes)}
              </span>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  )
}

function ReviewList({ reviews }: { reviews: GameReview[] }) {
  const { t } = useI18n()
  if (reviews.length === 0) {
    return <EmptyPlaceholder>{t("steam.emptyReviews")}</EmptyPlaceholder>
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <Link
          key={review.id}
          href={`/games/${review.app_id}`}
          className="flex gap-4 overflow-hidden rounded-2xl border bg-card p-3 shadow-sm transition hover:bg-muted/40"
        >
          <SteamCover
            src={steamCoverSources(review.app_id)}
            appId={review.app_id}
            alt=""
            className="h-[7.5rem] w-[13.5rem] shrink-0 rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="truncate font-display text-base font-bold">{review.game_title}</h3>
              <span className="shrink-0 text-xs text-muted-foreground">
                {review.updated_at.slice(0, 10).replaceAll("-", ".")}
              </span>
            </div>
            {review.review_text ? (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {plainTextFromContent(review.review_text) || t("steam.noReviewText")}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{t("steam.noReviewText")}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

export function SteamSection({
  rankedGames,
  recentGames,
  totalMinutes,
  twoWeekMinutes,
  reviews,
  profile,
}: {
  rankedGames: FeaturedGame[]
  recentGames: FeaturedGame[]
  totalMinutes: number
  twoWeekMinutes: number
  reviews: GameReview[]
  profile: SteamProfile | null
}) {
  const [tab, setTab] = useState<Tab>("recent")
  const { t } = useI18n()
  if (rankedGames.length === 0 && recentGames.length === 0 && reviews.length === 0) return null

  return (
    <section id="games" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-16">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-10 w-10 rounded-full border object-cover"
            />
          ) : null}
          <h2 className="font-display text-3xl font-extrabold">{t("steam.title")}</h2>
        </div>
        <Link href="/games" className="text-sm font-semibold underline">
          {t("common.more")}
        </Link>
      </div>

      <div
        role="tablist"
        aria-label={t("steam.tablist")}
        className="relative mt-5 grid w-full grid-cols-2 rounded-full bg-secondary p-1"
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-full bg-background shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none",
            tab === "rank" && "translate-x-full"
          )}
        />
        {(
          [
            ["recent", t("steam.recentShort"), t("steam.recent")],
            ["rank", t("steam.rankShort"), t("steam.rank")],
          ] as const
        ).map(([key, shortLabel, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={cn(
              "relative z-10 rounded-full px-2 py-2.5 text-sm font-semibold transition-colors duration-300 md:px-4",
              tab === key ? "text-foreground" : "text-muted-foreground"
            )}
            onClick={() => setTab(key)}
          >
            <span className="md:hidden">{shortLabel}</span>
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === "rank" && totalMinutes > 0 ? (
        <p className="mt-3 text-right text-sm text-muted-foreground">
          {t("steam.total", { time: formatPlaytime(totalMinutes) })}
          {twoWeekMinutes > 0 ? ` · ${t("steam.twoWeeks", { time: formatPlaytime(twoWeekMinutes) })}` : ""}
        </p>
      ) : null}

      <div className="mt-6">
        <div
          key={tab}
          className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 fill-mode-both motion-reduce:animate-none"
        >
          {tab === "rank" ? (
            <ShowcaseGrid games={rankedGames} kind="rank" />
          ) : (
            <ShowcaseGrid games={recentGames} kind="recent" />
          )}
        </div>
      </div>

      <div className="mt-12">
        <h3 className="font-display text-xl font-extrabold md:text-2xl">{t("steam.latestReviews")}</h3>
        <div className="mt-5">
          <ReviewList reviews={reviews} />
        </div>
      </div>
    </section>
  )
}

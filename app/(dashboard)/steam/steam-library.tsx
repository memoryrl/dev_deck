"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { WrittenReviewBadge } from "@/components/steam/review-badge"
import { SteamCover } from "@/components/steam/steam-cover"
import { TwoWeekBadge } from "@/components/steam/two-week-badge"
import { steamCoverSources } from "@/lib/steam/images"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn, formatLastPlayed, formatPlaytime } from "@/lib/utils"
import type { GameReview, SteamGame, SteamGamesResponse, SteamProfile } from "@/types/steam"

type SortKey = "playtime" | "recent" | "two_weeks"

export function SteamLibrary({
  reviews,
  hrefBase = "/steam",
  library,
  error = null,
}: {
  reviews: GameReview[]
  hrefBase?: "/steam" | "/games"
  library: SteamGamesResponse | null
  error?: string | null
}) {
  const [sort, setSort] = useState<SortKey>("playtime")

  const reviewMap = useMemo(
    () => new Map(reviews.map((review) => [review.app_id, review])),
    [reviews]
  )

  const games = useMemo(() => {
    const list = library?.games ?? []
    return [...list].sort((a, b) => compareGames(a, b, sort, reviewMap))
  }, [library, reviewMap, sort])

  const total = games.reduce((sum, game) => sum + game.playtime_forever_minutes, 0)
  const twoWeeks = games.reduce((sum, game) => sum + (game.playtime_2weeks_minutes ?? 0), 0)
  const deck = games.reduce((sum, game) => sum + game.playtime_deck_minutes, 0)
  const latest = [...games]
    .filter((game) => game.last_played_at)
    .sort((a, b) => Date.parse(b.last_played_at ?? "") - Date.parse(a.last_played_at ?? ""))[0]

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }
  if (!library) {
    return (
      <p className="text-sm text-muted-foreground">
        Steam 라이브러리를 불러오지 못했습니다. API 키와 Steam ID를 확인하세요.
      </p>
    )
  }
  if (games.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        게임이 없습니다. Steam 프로필을 공개로 두었는지, env의 STEAM_ID를 확인하세요.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <LibraryHeader
        profile={library.profile}
        gameCount={library.game_count}
        total={total}
        twoWeeks={twoWeeks}
        deck={deck}
        latest={latest}
      />

      <div
        role="tablist"
        aria-label="라이브러리 정렬"
        className="relative grid w-full grid-cols-3 rounded-full bg-secondary p-1"
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-background shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none",
            sort === "recent" && "translate-x-full",
            sort === "two_weeks" && "translate-x-[200%]"
          )}
        />
        {(
          [
            ["playtime", "누적", "누적 시간"],
            ["recent", "최근", "최근 플레이"],
            ["two_weeks", "2주", "최근 2주"],
          ] as const
        ).map(([key, shortLabel, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={sort === key}
            className={cn(
              "relative z-10 rounded-full px-3 py-2 text-sm font-semibold transition-colors duration-300",
              sort === key ? "text-foreground" : "text-muted-foreground"
            )}
            onClick={() => setSort(key)}
          >
            <span className="md:hidden">{shortLabel}</span>
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {games.map((game) => (
          <GameItem
            key={game.app_id}
            hrefBase={hrefBase}
            game={game}
            review={reviewMap.get(game.app_id)}
          />
        ))}
      </div>
    </div>
  )
}

function LibraryHeader({
  profile,
  gameCount,
  total,
  twoWeeks,
  deck,
  latest,
}: {
  profile: SteamProfile | null
  gameCount: number
  total: number
  twoWeeks: number
  deck: number
  latest?: SteamGame
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-12 w-12 rounded-full border object-cover"
          />
        ) : null}
        <div>
          <p className="font-display text-lg font-bold">{profile?.persona_name ?? "Steam 라이브러리"}</p>
          <p className="text-sm text-muted-foreground">
            {gameCount}게임 · 총 {formatPlaytime(total)}
            {profile?.profile_url ? (
              <>
                {" · "}
                <a href={profile.profile_url} target="_blank" rel="noreferrer" className="underline">
                  프로필
                </a>
              </>
            ) : null}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="누적" value={formatPlaytime(total)} />
        <Stat label="최근 2주" value={twoWeeks > 0 ? formatPlaytime(twoWeeks) : "없음"} />
        <Stat label="Deck" value={deck > 0 ? formatPlaytime(deck) : "없음"} />
        <Stat
          label="마지막 플레이"
          value={
            latest
              ? `${latest.name} · ${formatLastPlayed(latest.last_played_at) ?? ""}`
              : "없음"
          }
        />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  )
}

function compareGames(
  a: SteamGame,
  b: SteamGame,
  sort: SortKey,
  reviewMap: Map<number, GameReview>
) {
  if (sort === "playtime") {
    const favA = reviewMap.get(a.app_id)?.is_favorite ? 1 : 0
    const favB = reviewMap.get(b.app_id)?.is_favorite ? 1 : 0
    if (favA !== favB) return favB - favA
    return b.playtime_forever_minutes - a.playtime_forever_minutes
  }
  if (sort === "two_weeks") {
    return (b.playtime_2weeks_minutes ?? 0) - (a.playtime_2weeks_minutes ?? 0)
  }
  return Date.parse(b.last_played_at ?? "0") - Date.parse(a.last_played_at ?? "0")
}

function GameItem({
  game,
  review,
  hrefBase,
}: {
  game: SteamGame
  review?: GameReview
  hrefBase: "/steam" | "/games"
}) {
  const lastPlayed = formatLastPlayed(game.last_played_at)

  return (
    <Link href={`${hrefBase}/${game.app_id}`}>
      <Card className="overflow-hidden p-0">
        <div className="relative">
          <SteamCover
            src={steamCoverSources(game.app_id, game.header_image_url)}
            appId={game.app_id}
            alt=""
            className="h-48 w-full"
          />
          <TwoWeekBadge minutes={game.playtime_2weeks_minutes} />
          {review ? <WrittenReviewBadge /> : null}
        </div>
        <div className="p-4">
          <h3 className="font-display text-lg font-bold">{game.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatPlaytime(game.playtime_forever_minutes)}
            {lastPlayed ? ` · ${lastPlayed} 플레이` : ""}
          </p>
          {game.playtime_deck_minutes > 0 || review?.is_favorite ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {game.playtime_deck_minutes > 0 ? (
                <Badge variant="secondary">Deck {formatPlaytime(game.playtime_deck_minutes)}</Badge>
              ) : null}
              {review?.is_favorite ? <Badge variant="secondary">즐겨찾기</Badge> : null}
            </div>
          ) : null}
        </div>
      </Card>
    </Link>
  )
}

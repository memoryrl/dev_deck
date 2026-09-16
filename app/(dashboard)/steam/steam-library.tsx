import Link from "next/link"
import { ListPager } from "@/components/layout/list-pager"
import { WrittenReviewBadge } from "@/components/steam/review-badge"
import { SteamCover } from "@/components/steam/steam-cover"
import { TwoWeekBadge } from "@/components/steam/two-week-badge"
import { steamCoverSources } from "@/lib/steam/images"
import { compareSteamGames, type SteamLibrarySort } from "@/lib/steam/sort"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { getT } from "@/lib/i18n/dictionary"
import { formatLastPlayed } from "@/lib/i18n/format"
import { listQueryHref, paginateItems } from "@/lib/pagination"
import { cn, formatPlaytime } from "@/lib/utils"
import type { GameReview, SteamGame, SteamGamesResponse, SteamProfile } from "@/types/steam"

export function SteamLibrary({
  reviews,
  hrefBase = "/steam",
  library,
  error = null,
  page = 1,
  sort = "playtime",
}: {
  reviews: GameReview[]
  hrefBase?: "/steam" | "/games"
  library: SteamGamesResponse | null
  error?: string | null
  page?: number
  sort?: SteamLibrarySort
}) {
  const { t } = getT()
  const reviewMap = new Map(reviews.map((review) => [review.app_id, review]))
  const games = [...(library?.games ?? [])].sort((a, b) => compareSteamGames(a, b, sort, reviewMap))
  const paged = paginateItems(games, page)
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
    return <p className="text-sm text-muted-foreground">{t("steam.loadFailed")}</p>
  }
  if (games.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("steam.emptyLibrary")}</p>
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

      <SortTabs pathname={hrefBase} sort={sort} />

      <div className="grid gap-4 md:grid-cols-2">
        {paged.rows.map((game) => (
          <GameItem
            key={game.app_id}
            hrefBase={hrefBase}
            game={game}
            review={reviewMap.get(game.app_id)}
          />
        ))}
      </div>
      <ListPager pathname={hrefBase} result={paged} extraParams={{ sort }} />
    </div>
  )
}

function SortTabs({ pathname, sort }: { pathname: string; sort: SteamLibrarySort }) {
  const { t } = getT()
  return (
    <div role="tablist" aria-label={t("steam.sortAria")} className="relative grid w-full grid-cols-3 rounded-full bg-secondary p-1">
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
          ["playtime", t("steam.rankShort"), t("steam.playtimeRank")],
          ["recent", t("steam.recentShort"), t("steam.recent")],
          ["two_weeks", t("steam.twoWeeksShort"), t("steam.twoWeeksLabel")],
        ] as const
      ).map(([key, shortLabel, label]) => (
        <Link
          key={key}
          href={listQueryHref(pathname, {}, { sort: key, page: 1 })}
          role="tab"
          aria-selected={sort === key}
          className={cn(
            "relative z-10 rounded-full px-3 py-2 text-center text-sm font-semibold transition-colors duration-300",
            sort === key ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <span className="md:hidden">{shortLabel}</span>
          <span className="hidden md:inline">{label}</span>
        </Link>
      ))}
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
  const { t, dictionary } = getT()
  const lastPlayed = latest ? formatLastPlayed(latest.last_played_at, dictionary) : null
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
          <p className="font-display text-lg font-bold">{profile?.persona_name ?? t("games.title")}</p>
          <p className="text-sm text-muted-foreground">
            {t("steam.gameCount", { count: gameCount })} · {t("steam.totalTime", { time: formatPlaytime(total) })}
            {profile?.profile_url ? (
              <>
                {" · "}
                <a href={profile.profile_url} target="_blank" rel="noreferrer" className="underline">
                  {t("steam.profile")}
                </a>
              </>
            ) : null}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label={t("steam.playtime")} value={formatPlaytime(total)} />
        <Stat label={t("steam.twoWeeksLabel")} value={twoWeeks > 0 ? formatPlaytime(twoWeeks) : t("common.none")} />
        <Stat label="Deck" value={deck > 0 ? formatPlaytime(deck) : t("common.none")} />
        <Stat
          label={t("steam.lastPlayed")}
          value={latest ? `${latest.name} · ${lastPlayed ?? ""}` : t("common.none")}
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

function GameItem({
  game,
  review,
  hrefBase,
}: {
  game: SteamGame
  review?: GameReview
  hrefBase: "/steam" | "/games"
}) {
  const { t, dictionary } = getT()
  const lastPlayed = formatLastPlayed(game.last_played_at, dictionary)

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
            {lastPlayed ? ` · ${t("steam.played", { when: lastPlayed })}` : ""}
          </p>
          {game.playtime_deck_minutes > 0 || review?.is_favorite ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {game.playtime_deck_minutes > 0 ? (
                <Badge variant="secondary">Deck {formatPlaytime(game.playtime_deck_minutes)}</Badge>
              ) : null}
              {review?.is_favorite ? <Badge variant="secondary">{t("steam.favorite")}</Badge> : null}
            </div>
          ) : null}
        </div>
      </Card>
    </Link>
  )
}

import { Badge } from "@/components/ui/badge"
import { ScreenshotGallery } from "@/components/steam/screenshot-gallery"
import { SteamCover } from "@/components/steam/steam-cover"
import { TwoWeekBadge } from "@/components/steam/two-week-badge"
import { steamHeroSources } from "@/lib/steam/images"
import { formatLastPlayed, formatPlaytime } from "@/lib/utils"
import type {
  SteamAchievementSummary,
  SteamAppCatalog,
  SteamDeckCompat,
  SteamGame,
} from "@/types/steam"

const DECK_LABEL: Record<SteamDeckCompat, string> = {
  verified: "Deck 인증",
  playable: "Deck 플레이 가능",
  unsupported: "Deck 미지원",
  unknown: "Deck 미확인",
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function platformMinutes(game: SteamGame) {
  const rows = [
    { label: "Windows", minutes: game.playtime_windows_minutes },
    { label: "macOS", minutes: game.playtime_mac_minutes },
    { label: "Linux", minutes: game.playtime_linux_minutes },
    { label: "Deck", minutes: game.playtime_deck_minutes },
  ].filter((row) => row.minutes > 0)
  const onlyWindows = rows.length === 1 && rows[0].label === "Windows"
  return onlyWindows ? [] : rows
}

export function GameCatalog({
  appId,
  title,
  game,
  catalog,
  achievements,
}: {
  appId: number
  title: string
  game: SteamGame | null
  catalog: SteamAppCatalog | null
  achievements: SteamAchievementSummary | null
}) {
  const lastPlayed = formatLastPlayed(game?.last_played_at ?? null)
  const platforms = game ? platformMinutes(game) : []
  const os = catalog
    ? [
        catalog.platforms.windows ? "Windows" : null,
        catalog.platforms.mac ? "macOS" : null,
        catalog.platforms.linux ? "Linux" : null,
      ].filter(Boolean)
    : []
  const makers = Array.from(
    new Set([...(catalog?.developers ?? []), ...(catalog?.publishers ?? [])])
  )
  const achievementTotal = achievements?.total ?? catalog?.achievement_total

  return (
    <div className="space-y-5">
      <div className="relative">
        <SteamCover
          src={steamHeroSources(appId, catalog?.header_image)}
          appId={appId}
          alt=""
          className="aspect-[2.2/1] w-full rounded-xl"
        />
        <TwoWeekBadge minutes={game?.playtime_2weeks_minutes} />
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold md:text-4xl">{title}</h1>
          <a
            href={catalog?.store_url ?? `https://store.steampowered.com/app/${appId}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold underline"
          >
            Steam 상점
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          {game && game.playtime_deck_minutes > 0 ? (
            <Badge variant="secondary">Deck {formatPlaytime(game.playtime_deck_minutes)}</Badge>
          ) : null}
          {catalog?.deck_compat ? (
            <Badge variant="secondary">{DECK_LABEL[catalog.deck_compat]}</Badge>
          ) : null}
          {catalog?.coming_soon ? <Badge variant="outline">출시 예정</Badge> : null}
          {os.map((item) => (
            <Badge key={item} variant="outline">
              {item}
            </Badge>
          ))}
        </div>
      </div>

      {game || lastPlayed ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {game ? <Fact label="누적" value={formatPlaytime(game.playtime_forever_minutes)} /> : null}
          {game?.playtime_2weeks_minutes ? (
            <Fact label="최근 2주" value={formatPlaytime(game.playtime_2weeks_minutes)} />
          ) : null}
          {lastPlayed ? <Fact label="마지막 플레이" value={lastPlayed} /> : null}
          {achievementTotal ? (
            <Fact
              label="업적"
              value={
                achievements
                  ? `${achievements.unlocked} / ${achievements.total}`
                  : `${achievementTotal}`
              }
            />
          ) : null}
        </div>
      ) : null}

      {platforms.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          {platforms.map((row) => `${row.label} ${formatPlaytime(row.minutes)}`).join(" · ")}
        </p>
      ) : null}

      {achievements && achievements.total > 0 ? (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>업적 진행</span>
            <span>
              {achievements.unlocked} / {achievements.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground/80"
              style={{ width: `${Math.min(100, (achievements.unlocked / achievements.total) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {catalog?.short_description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{catalog.short_description}</p>
      ) : null}

      {makers.length > 0 || catalog?.genres.length || catalog?.release_date || catalog?.metacritic ? (
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          {makers.length > 0 ? (
            <div>
              <dt className="text-muted-foreground">개발 / 퍼블리셔</dt>
              <dd className="font-medium">{makers.join(", ")}</dd>
            </div>
          ) : null}
          {catalog?.genres.length ? (
            <div>
              <dt className="text-muted-foreground">장르</dt>
              <dd className="font-medium">{catalog.genres.join(", ")}</dd>
            </div>
          ) : null}
          {catalog?.release_date ? (
            <div>
              <dt className="text-muted-foreground">출시</dt>
              <dd className="font-medium">{catalog.release_date}</dd>
            </div>
          ) : null}
          {catalog?.metacritic ? (
            <div>
              <dt className="text-muted-foreground">Metacritic</dt>
              <dd className="font-medium">{catalog.metacritic}</dd>
            </div>
          ) : null}
          {catalog?.recommendations ? (
            <div>
              <dt className="text-muted-foreground">Steam 평가 수</dt>
              <dd className="font-medium">{catalog.recommendations.toLocaleString("ko-KR")}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {catalog?.screenshots?.length ? (
        <ScreenshotGallery items={catalog.screenshots} title={title} />
      ) : null}
    </div>
  )
}

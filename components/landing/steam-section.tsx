"use client"

import { useState } from "react"
import Link from "next/link"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"
import { plainTextFromContent } from "@/lib/content"
import { SteamCover } from "@/components/steam/steam-cover"
import { steamHeaderUrl } from "@/lib/steam/images"
import { cn, formatPlaytime } from "@/lib/utils"
import type { FeaturedGame } from "@/components/landing/steam-featured"
import type { GameReview } from "@/types/steam"

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

function RankGrid({ games }: { games: FeaturedGame[] }) {
  const [lead, ...rest] = games
  const side = rest.slice(0, 4)
  if (!lead) return <EmptyPlaceholder>표시할 게임이 없습니다.</EmptyPlaceholder>

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:grid-rows-2">
      <Link
        href={`/games/${lead.app_id}`}
        className="group relative flex h-full min-h-64 flex-col overflow-hidden rounded-2xl bg-[#171a21] md:row-span-2"
      >
        <SteamCover
          src={steamHeaderUrl(lead.app_id)}
          alt=""
          className="h-64 w-full md:absolute md:inset-0 md:h-full"
        />
        <RankMark rank={1} className="h-10 w-10 text-sm font-extrabold" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-4 pt-16 text-white">
          <div className="flex items-end justify-between gap-3">
            <h3 className="font-display text-xl font-bold leading-tight">{lead.name}</h3>
            {lead.playtime_forever_minutes > 0 ? (
              <span className="shrink-0 text-sm text-white/80">
                {formatPlaytime(lead.playtime_forever_minutes)}
              </span>
            ) : null}
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
            <SteamCover src={steamHeaderUrl(game.app_id)} alt="" className="h-28 w-full" />
            <RankMark rank={index + 2} className="h-8 w-8 text-xs font-bold" />
          </div>
          <div className="flex items-end justify-between gap-3 p-3">
            <h3 className="truncate font-display text-sm font-bold">{game.name}</h3>
            {game.playtime_forever_minutes > 0 ? (
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
  if (reviews.length === 0) {
    return <EmptyPlaceholder>아직 공개된 리뷰가 없습니다.</EmptyPlaceholder>
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
            src={steamHeaderUrl(review.app_id)}
            alt=""
            className="h-20 w-36 shrink-0 rounded-lg"
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
                {plainTextFromContent(review.review_text) || "한줄 리뷰가 아직 없습니다."}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">한줄 리뷰가 아직 없습니다.</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

export function SteamSection({
  games,
  totalMinutes,
  reviews,
}: {
  games: FeaturedGame[]
  totalMinutes: number
  reviews: GameReview[]
}) {
  const [tab, setTab] = useState<"rank" | "reviews">("rank")
  if (games.length === 0 && reviews.length === 0) return null

  return (
    <section id="games" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-16">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-3xl font-extrabold">Steam</h2>
        <Link href="/games" className="text-sm font-semibold underline">
          더 보기
        </Link>
      </div>

      <div
        role="tablist"
        aria-label="Steam 목록"
        className="relative mt-5 grid w-full grid-cols-2 rounded-full bg-secondary p-1"
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-background shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none",
            tab === "reviews" ? "translate-x-full" : "translate-x-0"
          )}
        />
        <button
          type="button"
          role="tab"
          aria-selected={tab === "rank"}
          className={cn(
            "relative z-10 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-300",
            tab === "rank" ? "text-foreground" : "text-muted-foreground"
          )}
          onClick={() => setTab("rank")}
        >
          누적 시간 순위
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reviews"}
          className={cn(
            "relative z-10 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-300",
            tab === "reviews" ? "text-foreground" : "text-muted-foreground"
          )}
          onClick={() => setTab("reviews")}
        >
          최신 리뷰 게시물
        </button>
      </div>

      {tab === "rank" && totalMinutes > 0 ? (
        <p className="mt-3 text-right text-sm text-muted-foreground">누적 {formatPlaytime(totalMinutes)}</p>
      ) : null}

      <div className="mt-6">
        <div
          key={tab}
          className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 fill-mode-both motion-reduce:animate-none"
        >
          {tab === "rank" ? <RankGrid games={games} /> : <ReviewList reviews={reviews} />}
        </div>
      </div>
    </section>
  )
}

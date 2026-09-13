"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { SteamCover } from "@/components/steam/steam-cover"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatPlaytime } from "@/lib/utils"
import type { GameReview, SteamGame, SteamGamesResponse } from "@/types/steam"

export function SteamLibrary({
  reviews,
  hrefBase = "/steam",
}: {
  reviews: GameReview[]
  hrefBase?: "/steam" | "/games"
}) {
  const [data, setData] = useState<SteamGamesResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/steam/games")
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "불러오지 못했습니다.")
        setData(json)
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  const reviewMap = useMemo(
    () => new Map(reviews.map((review) => [review.app_id, review])),
    [reviews]
  )

  const games = useMemo(() => {
    const list = data?.games ?? []
    return [...list].sort((a, b) => {
      const favA = reviewMap.get(a.app_id)?.is_favorite ? 1 : 0
      const favB = reviewMap.get(b.app_id)?.is_favorite ? 1 : 0
      if (favA !== favB) return favB - favA
      return b.playtime_forever_minutes - a.playtime_forever_minutes
    })
  }, [data, reviewMap])

  const total = games.reduce((sum, game) => sum + game.playtime_forever_minutes, 0)

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground">Steam 라이브러리를 불러오는 중…</p>
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
      <p className="text-sm text-muted-foreground">
        {data.game_count}게임 · 총 {formatPlaytime(total)}
      </p>
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

function GameItem({
  game,
  review,
  hrefBase,
}: {
  game: SteamGame
  review?: GameReview
  hrefBase: "/steam" | "/games"
}) {
  return (
    <Link href={`${hrefBase}/${game.app_id}`}>
      <Card className="overflow-hidden p-0">
        <SteamCover src={game.header_image_url} alt="" className="h-32 w-full" />
        <div className="p-4">
          <h3 className="font-display text-lg font-bold">{game.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{formatPlaytime(game.playtime_forever_minutes)}</p>
          <div className="mt-2 flex gap-2">
            {review ? <Badge>리뷰</Badge> : null}
            {review?.is_favorite ? <Badge variant="secondary">즐겨찾기</Badge> : null}
          </div>
        </div>
      </Card>
    </Link>
  )
}

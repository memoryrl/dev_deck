"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { deleteGameReview, upsertGameReview } from "../actions"
import { RichEditor } from "@/components/editor/rich-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StarRating } from "@/components/ui/star-rating"
import { Switch } from "@/components/ui/switch"
import type { GameReview } from "@/types/steam"

export function ReviewForm({
  appId,
  gameTitle,
  review,
}: {
  appId: number
  gameTitle: string
  review: GameReview | null
}) {
  const router = useRouter()
  const [favorite, setFavorite] = useState(review?.is_favorite ?? false)
  const [message, setMessage] = useState<string | null>(null)

  async function onSubmit(formData: FormData) {
    formData.set("app_id", String(appId))
    formData.set("game_title", gameTitle)
    if (favorite) formData.set("is_favorite", "on")
    else formData.delete("is_favorite")
    const result = await upsertGameReview(formData)
    setMessage(result.ok ? "저장했습니다." : result.error)
    router.refresh()
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <Label>평점</Label>
        <div className="mt-2">
          <StarRating defaultValue={review?.rating ?? 0} />
        </div>
      </div>
      <div>
        <Label>리뷰</Label>
        <div className="mt-2">
          <RichEditor name="review_text" defaultValue={review?.review_text ?? ""} placeholder="플레이 후기를 적어 주세요" />
        </div>
      </div>
      <div>
        <Label htmlFor="umpc_preset">UMPC 프리셋</Label>
        <Input
          id="umpc_preset"
          name="umpc_preset"
          placeholder="ROG Ally / Lossless Scaling ON / 15W TDP / 1080p 60FPS"
          defaultValue={review?.umpc_preset ?? ""}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={favorite} onCheckedChange={setFavorite} />
        <Label>즐겨찾기</Label>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <div className="flex gap-3">
        <Button type="submit">저장</Button>
        {review ? (
          <Button
            type="button"
            variant="destructive"
            onClick={async () => {
              await deleteGameReview(appId)
              router.refresh()
            }}
          >
            리뷰 삭제
          </Button>
        ) : null}
      </div>
    </form>
  )
}

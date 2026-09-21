"use client"

import { useRouter } from "next/navigation"
import { deleteComment, hideComment, removeProfanityWord } from "@/app/(dashboard)/site/comments/actions"
import { Button } from "@/components/ui/button"
import { showConfirm } from "@/lib/ui/layer-dialog"

export function CommentAdminActions({ id, hidden }: { id: string; hidden: boolean }) {
  const router = useRouter()

  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={async () => {
          await hideComment(id, !hidden)
          router.refresh()
        }}
      >
        {hidden ? "보이기" : "숨기기"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={async () => {
          const ok = await showConfirm("이 댓글과 하위 답글을 삭제할까요?", { destructive: true })
          if (!ok) return
          await deleteComment(id)
          router.refresh()
        }}
      >
        삭제
      </Button>
    </div>
  )
}

export function ProfanityDeleteButton({ id }: { id: string }) {
  const router = useRouter()
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        await removeProfanityWord(id)
        router.refresh()
      }}
    >
      삭제
    </Button>
  )
}

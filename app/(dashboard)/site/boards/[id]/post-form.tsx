"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { deleteBoardPost, upsertBoardPost } from "@/app/(dashboard)/site/actions"
import { NoticePopupToggle } from "@/components/board/notice-popup-toggle"
import { NOTICE_BOARD_SLUG } from "@/lib/boards/slugs"
import { RichEditor } from "@/components/editor/rich-editor"
import { Button } from "@/components/ui/button"
import { showConfirm } from "@/lib/ui/layer-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { BoardPost } from "@/types/board"

export function BoardPostAdminForm({
  boardId,
  boardSlug,
  post,
}: {
  boardId: string
  boardSlug?: string
  post?: BoardPost
}) {
  const router = useRouter()
  const [published, setPublished] = useState(post?.is_published ?? false)
  const [popup, setPopup] = useState(Boolean(post?.is_popup))
  const [error, setError] = useState<string | null>(null)
  const allowPopup = boardSlug === NOTICE_BOARD_SLUG

  async function onSubmit(formData: FormData) {
    formData.set("board_id", boardId)
    if (post) formData.set("id", post.id)
    if (published) formData.set("is_published", "on")
    else formData.delete("is_published")
    if (!post && allowPopup && popup) formData.set("is_popup", "on")
    else formData.delete("is_popup")
    const result = await upsertBoardPost(formData)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.push(`/site/boards/${boardId}`)
    router.refresh()
  }

  async function onDelete() {
    if (!post) return
    const ok = await showConfirm("이 글을 삭제할까요?", { destructive: true })
    if (!ok) return
    await deleteBoardPost(post.id, boardId)
    router.push(`/site/boards/${boardId}`)
    router.refresh()
  }

  return (
    <div className="min-w-0 space-y-4">
      {allowPopup && post ? <NoticePopupToggle postId={post.id} enabled={Boolean(post.is_popup)} /> : null}
      <form action={onSubmit} className="min-w-0 space-y-4">
      <div>
        <Label htmlFor="title">제목</Label>
        <Input id="title" name="title" required defaultValue={post?.title} />
      </div>
      <div>
        <Label htmlFor="excerpt">요약</Label>
        <Input id="excerpt" name="excerpt" defaultValue={post?.excerpt ?? ""} />
      </div>
      <div>
        <Label>본문</Label>
        <div className="mt-2">
          <RichEditor name="content" defaultValue={post?.content ?? ""} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={published} onCheckedChange={setPublished} />
        <Label>공개</Label>
      </div>
      {allowPopup && !post ? (
        <div className="flex items-center gap-2">
          <Switch checked={popup} onCheckedChange={setPopup} />
          <Label>공지 팝업</Label>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit">{post ? "저장" : "등록"}</Button>
        {post ? (
          <Button type="button" variant="destructive" onClick={onDelete}>
            삭제
          </Button>
        ) : null}
      </div>
    </form>
    </div>
  )
}

import Link from "next/link"
import { notFound } from "next/navigation"
import { BoardPostAdminForm } from "@/app/(dashboard)/site/boards/[id]/post-form"
import { getBoardById, getBoardPost } from "@/lib/boards/public"
import { ensureProfile } from "@/lib/supabase/server"

export default async function SiteBoardPostPage({
  params,
}: {
  params: { id: string; postId: string }
}) {
  await ensureProfile()
  const board = await getBoardById(params.id)
  const post = await getBoardPost(params.postId)
  if (!board || !post || post.board_id !== board.id) notFound()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href={`/site/boards/${board.id}`} className="text-sm font-semibold underline">
        {board.name}
      </Link>
      <h1 className="font-display text-3xl font-extrabold">글 수정</h1>
      <BoardPostAdminForm boardId={board.id} post={post} />
    </div>
  )
}

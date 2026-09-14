import { notFound } from "next/navigation"
import { BoardPostAdminForm } from "@/app/(dashboard)/site/boards/[id]/post-form"
import { PostPager } from "@/components/board/post-pager"
import { getBoardById, getBoardPost, listBoardPosts } from "@/lib/boards/public"
import { findNeighbors } from "@/lib/posts/neighbors"
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
  const listHref = `/site/boards/${board.id}`
  const neighbors = findNeighbors(
    await listBoardPosts(board.id),
    post.id,
    (item) => item.id,
    (item) => `${listHref}/${item.id}`,
    (item) => item.title
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PostPager listHref={listHref} {...neighbors} />
      <h1 className="font-display text-3xl font-extrabold">글 수정</h1>
      <BoardPostAdminForm boardId={board.id} post={post} />
      <PostPager listHref={listHref} {...neighbors} />
    </div>
  )
}

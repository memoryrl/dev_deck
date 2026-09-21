import { Suspense } from "react"
import { notFound } from "next/navigation"
import { BoardPostAdminForm } from "@/app/(dashboard)/site/boards/[id]/post-form"
import { PostPager } from "@/components/board/post-pager"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { EditorFormSkeleton, PagerSkeleton } from "@/components/layout/skeletons"
import { getBoardById, getBoardPost, listBoardPosts } from "@/lib/boards/public"
import { findNeighbors } from "@/lib/posts/neighbors"
import { ensureProfile } from "@/lib/supabase/server"
import { ShareButton } from "@/components/share/share-button"

export default function SiteBoardPostPage({
  params,
}: {
  params: { id: string; postId: string }
}) {
  const listHref = `/site/boards/${params.id}`

  return (
    <div className="w-full space-y-6">
      <Suspense fallback={<PagerSkeleton />}>
        <NeighborsPager boardId={params.id} postId={params.postId} listHref={listHref} />
      </Suspense>
      <Suspense
        fallback={<PageTitleBanner title="글 수정" breadcrumb={[{ label: "글 수정" }]} />}
      >
        <BoardPostTitleSection boardId={params.id} postId={params.postId} />
      </Suspense>
      <Suspense fallback={<EditorFormSkeleton />}>
        <BoardPostFormSection boardId={params.id} postId={params.postId} />
      </Suspense>
      <Suspense fallback={<PagerSkeleton className="mt-10" />}>
        <NeighborsPager boardId={params.id} postId={params.postId} listHref={listHref} placement="bottom" />
      </Suspense>
    </div>
  )
}

async function NeighborsPager({
  boardId,
  postId,
  listHref,
  placement,
}: {
  boardId: string
  postId: string
  listHref: string
  placement?: "bottom"
}) {
  const posts = await listBoardPosts(boardId)
  const neighbors = findNeighbors(
    posts,
    postId,
    (item) => item.id,
    (item) => `${listHref}/${item.id}`,
    (item) => item.title
  )
  return <PostPager listHref={listHref} placement={placement} {...neighbors} />
}

async function BoardPostTitleSection({ boardId, postId }: { boardId: string; postId: string }) {
  const board = await getBoardById(boardId)
  return (
    <PageTitleBanner
      title="글 수정"
      breadcrumb={[
        { label: board?.name ?? "게시판", href: `/site/boards/${boardId}` },
        { label: "글 수정" },
      ]}
      actions={<ShareButton targetType="board_post" targetId={postId} />}
    />
  )
}

async function BoardPostFormSection({ boardId, postId }: { boardId: string; postId: string }) {
  const [, board, post] = await Promise.all([ensureProfile(), getBoardById(boardId), getBoardPost(postId)])
  if (!board || !post || post.board_id !== board.id) notFound()
  return <BoardPostAdminForm boardId={board.id} boardSlug={board.slug} post={post} />
}

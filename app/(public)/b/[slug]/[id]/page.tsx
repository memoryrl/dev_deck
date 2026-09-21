import { Suspense } from "react"
import { notFound } from "next/navigation"
import { AccessDeniedPage } from "@/components/errors/access-denied-page"
import { ArticleEditPanel } from "@/components/board/article-edit-panel"
import { ArticleReader } from "@/components/board/article-reader"
import { PostPager } from "@/components/board/post-pager"
import { PublicPostForm } from "@/components/board/public-post-form"
import { NoticePopupToggle } from "@/components/board/notice-popup-toggle"
import { NOTICE_BOARD_SLUG } from "@/lib/boards/community"
import { ArticleComments } from "@/components/comments/article-comments"
import { CommentSectionSkeleton, PagerSkeleton } from "@/components/layout/skeletons"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { PublicContainer } from "@/components/layout/public-container"
import { RichContent } from "@/components/editor/rich-content"
import { boardPath, roleAtLeast } from "@/lib/access"
import { currentViewer } from "@/lib/boards/access"
import { commentRoleFor } from "@/lib/boards/permissions"
import { getBoardBySlug, getBoardPost, listBoardPosts } from "@/lib/boards/public"
import { isSystemBoard } from "@/lib/boards/system"
import { findNeighbors } from "@/lib/posts/neighbors"
import type { Board, BoardPost } from "@/types/board"
import { ShareButton } from "@/components/share/share-button"

export default async function PublicBoardPostPage(
  props: {
    params: Promise<{ slug: string; id: string }>
  }
) {
  const params = await props.params;
  // board·post·viewer 셋 다 서로 결과를 안 쓰지만, view_role 판정(비공개 게시판 여부)이
  // viewer에 달려있어서 이 셋은 "보여줄지 말지" 자체를 가르는 공통 게이트다 — 그래서
  // 여기서 같이 기다린다. 이웃글 목록만 그 판정과 무관해서 따로 뗄 수 있다.
  const [board, post, viewer] = await Promise.all([
    getBoardBySlug(params.slug),
    getBoardPost(params.id),
    currentViewer(),
  ])
  if (!board || !board.is_active || isSystemBoard(board) || !post || post.board_id !== board.id) notFound()

  const { role, isOwner, userId } = viewer
  if (!roleAtLeast(role, board.view_role)) return <AccessDeniedPage role={role} />

  const canWrite =
    roleAtLeast(role, board.write_role) && (isOwner || post.user_id === userId)
  const listHref = boardPath(board.slug)
  // 공유 링크는 글을 쓴 사람과 관리자만 만들 수 있다.
  const canShare = Boolean(userId) && (isOwner || post.user_id === userId)

  const view = (
    <>
      <PageTitleBanner
        title={post.title}
        className="mt-6"
        actions={canShare ? <ShareButton targetType="board_post" targetId={post.id} /> : undefined}
      />
      <div className="mt-8">
        <RichContent content={post.content} variant="article" />
      </div>
    </>
  )

  return (
    <PublicContainer as="article">
      <ArticleReader>
        <Suspense fallback={<PagerSkeleton />}>
          <NeighborsPager board={board} post={post} listHref={listHref} />
        </Suspense>
        {isOwner && board.slug === NOTICE_BOARD_SLUG ? (
          <div className="mt-4 flex justify-end">
            <NoticePopupToggle postId={post.id} enabled={Boolean(post.is_popup)} />
          </div>
        ) : null}
        {canWrite ? (
          <ArticleEditPanel
            form={
              <PublicPostForm
                boardId={board.id}
                slug={board.slug}
                post={post}
                returnTo={`${listHref}/${post.id}`}
              />
            }
          >
            {view}
          </ArticleEditPanel>
        ) : (
          view
        )}
        <Suspense fallback={<PagerSkeleton className="mt-10" />}>
          <NeighborsPager board={board} post={post} listHref={listHref} placement="bottom" />
        </Suspense>
        <Suspense fallback={<CommentSectionSkeleton />}>
          <ArticleComments
            targetType="board"
            targetId={post.id}
            returnTo={`${listHref}/${post.id}`}
            commentRole={commentRoleFor(board)}
          />
        </Suspense>
      </ArticleReader>
    </PublicContainer>
  )
}

async function NeighborsPager({
  board,
  post,
  listHref,
  placement,
}: {
  board: Board
  post: BoardPost
  listHref: string
  placement?: "bottom"
}) {
  const posts = await listBoardPosts(board.id)
  const neighbors = findNeighbors(
    posts,
    post.id,
    (item) => item.id,
    (item) => `${listHref}/${item.id}`,
    (item) => item.title
  )
  return <PostPager placement={placement} listHref={listHref} {...neighbors} />
}

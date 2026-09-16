import { notFound } from "next/navigation"
import { ArticleEditPanel } from "@/components/board/article-edit-panel"
import { ArticleReader } from "@/components/board/article-reader"
import { PostPager } from "@/components/board/post-pager"
import { PublicPostForm } from "@/components/board/public-post-form"
import { ArticleComments } from "@/components/comments/article-comments"
import { PublicContainer } from "@/components/layout/public-container"
import { RichContent } from "@/components/editor/rich-content"
import { boardPath, roleAtLeast } from "@/lib/access"
import { currentViewer } from "@/lib/boards/access"
import { commentRoleFor } from "@/lib/boards/permissions"
import { getBoardBySlug, getBoardPost, listBoardPosts } from "@/lib/boards/public"
import { isSystemBoard } from "@/lib/boards/system"
import { findNeighbors } from "@/lib/posts/neighbors"

export default async function PublicBoardPostPage({
  params,
}: {
  params: { slug: string; id: string }
}) {
  const board = await getBoardBySlug(params.slug)
  const post = await getBoardPost(params.id)
  if (!board || !board.is_active || isSystemBoard(board) || !post || post.board_id !== board.id) notFound()

  const { role, isOwner, userId } = await currentViewer()
  if (!roleAtLeast(role, board.view_role)) notFound()

  const canWrite =
    roleAtLeast(role, board.write_role) && (isOwner || post.user_id === userId)
  const listHref = boardPath(board.slug)
  const neighbors = findNeighbors(
    await listBoardPosts(board.id),
    post.id,
    (item) => item.id,
    (item) => `${listHref}/${item.id}`,
    (item) => item.title
  )

  const view = (
    <>
      <h1 className="mt-6 font-display text-4xl font-extrabold">{post.title}</h1>
      <div className="mt-8">
        <RichContent content={post.content} />
      </div>
    </>
  )

  return (
    <PublicContainer as="article">
      <ArticleReader>
        <PostPager listHref={listHref} {...neighbors} />
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
        <PostPager placement="bottom" listHref={listHref} {...neighbors} />
        <ArticleComments
          targetType="board"
          targetId={post.id}
          returnTo={`${listHref}/${post.id}`}
          commentRole={commentRoleFor(board)}
        />
      </ArticleReader>
    </PublicContainer>
  )
}

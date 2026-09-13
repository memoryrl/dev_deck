import Link from "next/link"
import { notFound } from "next/navigation"
import { PublicPostForm } from "@/components/board/public-post-form"
import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { Card } from "@/components/ui/card"
import { RichContent } from "@/components/editor/rich-content"
import { accessRoleOf, boardPath, roleAtLeast } from "@/lib/access"
import { getBoardBySlug, getBoardPost } from "@/lib/boards/public"
import { isSystemBoard } from "@/lib/boards/system"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export default async function PublicBoardPostPage({
  params,
}: {
  params: { slug: string; id: string }
}) {
  const board = await getBoardBySlug(params.slug)
  const post = await getBoardPost(params.id)
  if (!board || !board.is_active || isSystemBoard(board) || !post || post.board_id !== board.id) notFound()

  let role = accessRoleOf(null)
  let userId: string | null = null
  if (isSupabaseConfigured()) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    role = accessRoleOf(user)
    userId = user?.id ?? null
  }

  if (!roleAtLeast(role, board.view_role)) notFound()

  const canWrite =
    roleAtLeast(role, board.write_role) && (role === "owner" || post.user_id === userId)

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <article className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <Link href={boardPath(board.slug)} className="text-sm font-semibold underline">
          {board.name}
        </Link>
        <h1 className="mt-4 font-display text-4xl font-extrabold">{post.title}</h1>
        <div className="mt-8">
          <RichContent content={post.content} />
        </div>
        {canWrite ? (
          <Card className="mt-10">
            <h2 className="mb-4 font-display text-xl font-bold">수정</h2>
            <PublicPostForm boardId={board.id} slug={board.slug} post={post} />
          </Card>
        ) : null}
      </article>
      <PublicFooter />
    </div>
  )
}

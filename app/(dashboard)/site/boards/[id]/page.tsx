import Link from "next/link"
import { notFound } from "next/navigation"
import { BoardForm } from "@/app/(dashboard)/site/boards/board-form"
import { BoardPostAdminForm } from "@/app/(dashboard)/site/boards/[id]/post-form"
import { PostList } from "@/components/board/post-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getBoardById, listBoardPosts } from "@/lib/boards/public"
import { isSystemBoard, kindLabel, listModuleEntries, systemDashboardHref } from "@/lib/boards/system"
import { ensureProfile } from "@/lib/supabase/server"

export default async function SiteBoardDetailPage({ params }: { params: { id: string } }) {
  await ensureProfile()
  const board = await getBoardById(params.id)
  if (!board) notFound()
  const system = isSystemBoard(board)
  const posts = system ? [] : await listBoardPosts(board.id)
  const entries = system ? await listModuleEntries(board.kind) : []

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link href="/site/boards" className="text-sm font-semibold underline">
          게시판 목록
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{kindLabel(board.kind)}</Badge>
            </div>
            <h1 className="mt-2 font-display text-3xl font-extrabold">{board.name}</h1>
          </div>
          {system ? (
            <Link href={systemDashboardHref(board.kind)}>
              <Button variant="outline">대시보드에서 편집</Button>
            </Link>
          ) : null}
        </div>
      </div>
      <Card>
        <h2 className="mb-4 font-display text-xl font-bold">설정</h2>
        <BoardForm board={board} />
      </Card>
      {system ? (
        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold">글</h2>
          <p className="text-sm text-muted-foreground">
            이 게시판의 글은 {kindLabel(board.kind)} 전용 테이블에 있습니다. 범용 글쓰기는 쓰지 않습니다.
          </p>
          <PostList
            searchable
            empty="글이 없습니다."
            items={entries.map((entry) => ({
              href: entry.href,
              title: entry.title,
              createdAt: entry.createdAt,
              meta: [entry.note, entry.published ? "공개" : "비공개"].filter(Boolean).join(" · "),
            }))}
          />
        </div>
      ) : (
        <>
          <Card>
            <h2 className="mb-4 font-display text-xl font-bold">새 글</h2>
            <BoardPostAdminForm boardId={board.id} />
          </Card>
          <PostList
            searchable
            empty="글이 없습니다."
            items={posts.map((post) => ({
              href: `/site/boards/${board.id}/${post.id}`,
              title: post.title,
              createdAt: post.created_at,
              meta: post.is_published ? "공개" : "비공개",
            }))}
          />
        </>
      )}
    </div>
  )
}

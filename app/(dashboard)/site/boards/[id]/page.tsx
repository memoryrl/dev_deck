import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BoardForm } from "@/app/(dashboard)/site/boards/board-form"
import { BoardPostAdminForm } from "@/app/(dashboard)/site/boards/[id]/post-form"
import { PostList } from "@/components/board/post-list"
import { WriteForm, WritePanel, WriteToggle } from "@/components/board/write-panel"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton, TitleSkeleton } from "@/components/layout/skeletons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getBoardById, listBoardPostsPage } from "@/lib/boards/public"
import { isSystemBoard, kindLabel, listModuleEntriesPage, systemDashboardHref } from "@/lib/boards/system"
import { parseListPage, parseSearchQuery } from "@/lib/pagination"
import { ensureProfile } from "@/lib/supabase/server"

export default function SiteBoardDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { page?: string; q?: string }
}) {
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)

  return (
    <div className="w-full space-y-8">
      <Suspense fallback={<TitleSkeleton />}>
        <BoardHeaderAndSettings id={params.id} />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <BoardEntries id={params.id} page={page} q={q} />
      </Suspense>
    </div>
  )
}

async function BoardHeaderAndSettings({ id }: { id: string }) {
  await ensureProfile()
  const board = await getBoardById(id)
  if (!board) notFound()
  const system = isSystemBoard(board)

  return (
    <>
      <PageTitleBanner
        title={board.name}
        breadcrumb={[{ label: board.name }]}
        actions={
          <>
            <Badge variant="secondary">{kindLabel(board.kind)}</Badge>
            {system ? (
              <Link href={systemDashboardHref(board.kind)}>
                <Button variant="outline">대시보드에서 편집</Button>
              </Link>
            ) : null}
          </>
        }
      />
      <Card>
        <h2 className="mb-4 font-display text-xl font-bold">설정</h2>
        <BoardForm board={board} />
      </Card>
      {!system ? (
        <WritePanel label="새 글" closeLabel="접기">
          <div className="flex justify-end">
            <WriteToggle />
          </div>
          <WriteForm>
            <BoardPostAdminForm boardId={board.id} />
          </WriteForm>
        </WritePanel>
      ) : null}
    </>
  )
}

async function BoardEntries({ id, page, q }: { id: string; page: number; q: string }) {
  const board = await getBoardById(id)
  if (!board) return null
  const system = isSystemBoard(board)
  const pathname = `/site/boards/${board.id}`

  if (system) {
    const entries = await listModuleEntriesPage(board.kind, page, q)
    return (
      <div className="space-y-3">
        <h2 className="font-display text-xl font-bold">글</h2>
        <p className="text-sm text-muted-foreground">
          이 게시판의 글은 {kindLabel(board.kind)} 전용 테이블에 있습니다. 범용 글쓰기는 쓰지 않습니다.
        </p>
        <PostList
          searchable
          pathname={pathname}
          searchQuery={q}
          paged={entries}
          empty="글이 없습니다."
          items={entries.rows.map((entry) => ({
            href: entry.href,
            title: entry.title,
            createdAt: entry.createdAt,
            meta: [entry.note, entry.published ? "공개" : "비공개"].filter(Boolean).join(" · "),
          }))}
        />
      </div>
    )
  }

  const posts = await listBoardPostsPage(board.id, page, q)
  return (
    <PostList
      searchable
      pathname={pathname}
      searchQuery={q}
      paged={posts}
      empty="글이 없습니다."
      items={posts.rows.map((post) => ({
        href: `/site/boards/${board.id}/${post.id}`,
        title: post.title,
        createdAt: post.created_at,
        meta: post.is_published ? "공개" : "비공개",
      }))}
    />
  )
}

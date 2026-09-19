import { Suspense } from "react"
import Link from "next/link"
import { BoardForm } from "@/app/(dashboard)/site/boards/board-form"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { roleLabel } from "@/lib/access"
import { listBoards } from "@/lib/boards/public"
import { ensureSystemBoards, isSystemBoard, kindLabel } from "@/lib/boards/system"
import { ensureProfile } from "@/lib/supabase/server"

export default function SiteBoardsPage() {
  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title="게시판"
        description="PromptKit·CareerLog·Steam 시스템 게시판과 범용 게시판을 함께 관리합니다. 읽기 권한은 방문객·회원·관리자 단계입니다."
      />
      <Card>
        <h2 className="mb-4 font-display text-xl font-bold">새 게시판</h2>
        <BoardForm />
      </Card>
      <Suspense fallback={<ListSkeleton withSearch={false} />}>
        <BoardList />
      </Suspense>
    </div>
  )
}

async function BoardList() {
  await ensureProfile()
  await ensureSystemBoards()
  const boards = await listBoards()
  if (boards.length === 0) {
    return <p className="text-sm text-muted-foreground">아직 게시판이 없습니다.</p>
  }
  return (
    <ul className="divide-y border-y bg-white dark:bg-card">
      {boards.map((board) => (
        <li key={board.id}>
          <Link
            href={`/site/boards/${board.id}`}
            className="block px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5"
          >
            <div className="flex flex-wrap gap-2">
              <Badge>{board.slug}</Badge>
              <Badge variant="secondary">{kindLabel(board.kind ?? "generic")}</Badge>
              {board.is_active ? <Badge variant="secondary">활성</Badge> : <Badge>비활성</Badge>}
              <Badge variant="secondary">읽기 {roleLabel(board.view_role)}</Badge>
              <Badge variant="secondary">쓰기 {roleLabel(board.write_role)}</Badge>
              <Badge variant="secondary">댓글 {roleLabel(board.comment_role)}</Badge>
              {isSystemBoard({ kind: board.kind ?? "generic" }) ? (
                <Badge variant="secondary">삭제 불가</Badge>
              ) : null}
            </div>
            <h3 className="mt-2 font-display text-lg font-bold">{board.name}</h3>
            {board.description ? <p className="mt-1 text-sm text-muted-foreground">{board.description}</p> : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}

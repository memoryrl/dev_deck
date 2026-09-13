import Link from "next/link"
import { BoardForm } from "@/app/(dashboard)/site/boards/board-form"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { roleLabel } from "@/lib/access"
import { listBoards } from "@/lib/boards/public"
import { ensureSystemBoards, isSystemBoard, kindLabel } from "@/lib/boards/system"
import { ensureProfile } from "@/lib/supabase/server"

export default async function SiteBoardsPage() {
  await ensureProfile()
  await ensureSystemBoards()
  const boards = await listBoards()

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold">게시판</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          PromptKit·CareerLog·Steam 시스템 게시판과 범용 게시판을 함께 관리합니다. 읽기 권한은
          방문객·회원·관리자 단계입니다.
        </p>
      </div>
      <Card>
        <h2 className="mb-4 font-display text-xl font-bold">새 게시판</h2>
        <BoardForm />
      </Card>
      {boards.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 게시판이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {boards.map((board) => (
            <Link key={board.id} href={`/site/boards/${board.id}`}>
              <Card>
                <div className="flex flex-wrap gap-2">
                  <Badge>{board.slug}</Badge>
                  <Badge variant="secondary">{kindLabel(board.kind ?? "generic")}</Badge>
                  {board.is_active ? <Badge variant="secondary">활성</Badge> : <Badge>비활성</Badge>}
                  <Badge variant="secondary">읽기 {roleLabel(board.view_role)}</Badge>
                  <Badge variant="secondary">쓰기 {roleLabel(board.write_role)}</Badge>
                  {isSystemBoard({ kind: board.kind ?? "generic" }) ? (
                    <Badge variant="secondary">삭제 불가</Badge>
                  ) : null}
                </div>
                <h3 className="mt-3 font-display text-xl font-bold">{board.name}</h3>
                {board.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{board.description}</p>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

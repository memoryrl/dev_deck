import { MenuForm } from "@/app/(dashboard)/site/menus/menu-form"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { roleLabel } from "@/lib/access"
import { listBoards } from "@/lib/boards/public"
import { listAllMenus } from "@/lib/menus/public"
import { ensureProfile } from "@/lib/supabase/server"

export default async function SiteMenusPage() {
  await ensureProfile()
  const [menus, boards] = await Promise.all([listAllMenus(), listBoards()])
  const top = menus.filter((item) => !item.parent_id)

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold">메뉴</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          헤더·푸터 메뉴를 DB에서 관리합니다. 게시판을 연결하면 `/b/슬러그`로 열립니다. 권한보다 낮은 역할에게는 보이지 않습니다.
        </p>
      </div>
      <Card>
        <h2 className="mb-4 font-display text-xl font-bold">새 메뉴</h2>
        <MenuForm menus={menus} boards={boards} />
      </Card>
      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground">메뉴가 없으면 헤더는 기본 메가메뉴를 사용합니다.</p>
      ) : (
        <div className="space-y-4">
          {top.map((item) => {
            const children = menus.filter((child) => child.parent_id === item.id)
            return (
              <Card key={item.id} className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Badge>{item.location === "header" ? "헤더" : "푸터"}</Badge>
                  <Badge variant="secondary">{roleLabel(item.view_role)} 이상</Badge>
                  {item.is_active ? null : <Badge>비활성</Badge>}
                  {item.boards ? <Badge variant="secondary">{item.boards.name}</Badge> : null}
                </div>
                <MenuForm menu={item} menus={menus} boards={boards} />
                {children.length > 0 ? (
                  <div className="space-y-4 border-t pt-4">
                    <p className="text-sm font-semibold">하위 메뉴</p>
                    {children.map((child) => (
                      <div key={child.id} className="rounded-xl border p-4">
                        <MenuForm menu={child} menus={menus} boards={boards} />
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { MenusWorkspace } from "@/app/(dashboard)/site/menus/menus-workspace"
import { listBoards } from "@/lib/boards/public"
import { listAllMenus } from "@/lib/menus/public"
import { ensureDefaultMenus } from "@/lib/menus/seed"
import { ensureProfile } from "@/lib/supabase/server"

export default async function SiteMenusPage() {
  await ensureProfile()
  await ensureDefaultMenus()
  const [menus, boards] = await Promise.all([listAllMenus(), listBoards()])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">메뉴</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          왼쪽에서 권한별 메뉴 트리를 확인하고, 오른쪽에서 상세를 편집하거나 새 메뉴를 추가합니다.
        </p>
      </div>
      <MenusWorkspace menus={menus} boards={boards} />
    </div>
  )
}

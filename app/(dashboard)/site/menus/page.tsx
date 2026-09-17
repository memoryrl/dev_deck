import { Suspense } from "react"
import { MenusWorkspace } from "@/app/(dashboard)/site/menus/menus-workspace"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
import { listBoards } from "@/lib/boards/public"
import { listAllMenus } from "@/lib/menus/public"
import { ensureDefaultMenus } from "@/lib/menus/seed"
import { ensureProfile } from "@/lib/supabase/server"

export default function SiteMenusPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageTitleBanner title="메뉴" />
      <p className="text-sm text-muted-foreground">
        왼쪽에서 권한별 메뉴 트리를 확인하고, 오른쪽에서 상세를 편집하거나 새 메뉴를 추가합니다.
      </p>
      <Suspense fallback={<ListSkeleton withSearch={false} />}>
        <MenusWorkspaceBody />
      </Suspense>
    </div>
  )
}

async function MenusWorkspaceBody() {
  await ensureProfile()
  await ensureDefaultMenus()
  const [menus, boards] = await Promise.all([listAllMenus(), listBoards()])
  return <MenusWorkspace menus={menus} boards={boards} />
}

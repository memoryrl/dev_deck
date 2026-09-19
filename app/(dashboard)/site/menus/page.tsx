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
    <div className="w-full space-y-6">
      <PageTitleBanner
        title="메뉴"
        description="왼쪽에서 권한별 메뉴 트리를 확인하고, 오른쪽에서 상세·다국어 이름을 편집하거나 새 메뉴를 추가합니다. 관리자 트리는 대시보드 좌측 사이드바에 그대로 반영됩니다."
      />
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

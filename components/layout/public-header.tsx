import { PublicHeaderNav } from "@/components/layout/public-header-nav"
import { accessRoleOf } from "@/lib/access"
import { sessionUserView } from "@/lib/auth/session-user"
import { currentViewer } from "@/lib/boards/access"
import { listAdminMenus } from "@/lib/menus/admin"
import { listNavMenus } from "@/lib/menus/public"

export async function PublicHeader() {
  const viewer = await currentViewer()
  const account = viewer.user ? sessionUserView(viewer.user) : null
  const role = accessRoleOf(viewer.user)
  const [navNodes, adminMenus] = await Promise.all([
    listNavMenus("header", role),
    account?.isOwner ? listAdminMenus() : Promise.resolve([]),
  ])

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 overflow-visible">
        <PublicHeaderNav account={account} navNodes={navNodes} adminMenus={adminMenus} />
      </header>
      <div className="h-14 shrink-0" aria-hidden />
    </>
  )
}

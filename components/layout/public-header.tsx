import { PublicHeaderNav } from "@/components/layout/public-header-nav"
import { sessionUserView } from "@/lib/auth/session-user"
import { currentViewer } from "@/lib/boards/access"
import { listAdminMenus } from "@/lib/menus/admin"
import { listNavMenus } from "@/lib/menus/public"

export async function PublicHeader() {
  const viewer = await currentViewer()
  const account = viewer.user ? sessionUserView(viewer.user) : null
  const [navNodes, adminMenus] = await Promise.all([
    listNavMenus("header"),
    account?.isOwner ? listAdminMenus() : Promise.resolve([]),
  ])

  return (
    <header className="sticky top-0 z-50 overflow-visible">
      <PublicHeaderNav account={account} navNodes={navNodes} adminMenus={adminMenus} />
    </header>
  )
}

import { PublicHeaderNav } from "@/components/layout/public-header-nav"
import { sessionUserView } from "@/lib/auth/session-user"
import { currentViewer } from "@/lib/boards/access"
import { listNavMenus } from "@/lib/menus/public"

export async function PublicHeader() {
  const viewer = await currentViewer()
  const account = viewer.user ? sessionUserView(viewer.user) : null
  const navNodes = await listNavMenus("header")

  return (
    <header className="sticky top-0 z-30 overflow-visible">
      <PublicHeaderNav account={account} navNodes={navNodes} />
    </header>
  )
}

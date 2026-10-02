import { EscortOverlay } from "@/components/landing/hero-topology/escort-overlay"
import { accessRoleOf } from "@/lib/access"
import { currentViewer } from "@/lib/boards/access"
import { listNavMenus } from "@/lib/menus/public"

// 공개 셸(PublicHeaderNav)에만 있던 로봇 안내 오버레이를 관리자 레이아웃에도 둔다.
// 관리자 사이드바·헤더에서 화면을 옮길 때도 관리자 로봇이 "따라오세요" 하며 안내하게 하려는 것.
export async function DashboardEscort() {
  const viewer = await currentViewer()
  const navNodes = await listNavMenus("header", accessRoleOf(viewer.user))
  return <EscortOverlay navNodes={navNodes} owner={viewer.isOwner} />
}

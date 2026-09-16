import { ADMIN_NAV } from "@/components/layout/admin-nav"
import { roleAtLeast } from "@/lib/access"
import { currentViewer } from "@/lib/boards/access"
import { getT } from "@/lib/i18n/dictionary"
import { listAllMenus } from "@/lib/menus/public"
import type { MenuItem } from "@/types/menu"

// 08-landing-topology.md 갱신본 참고. "결국 루트 메뉴에 따라 로봇이 배정된다"는
// 방향에 맞춰, 하드코딩된 PromptKit/CareerLog/Steam 3개 대신 실제 헤더 루트 메뉴
// (devdeck.menus, location='header', parent_id=null)를 그대로 팀원 책상으로 그린다.
// 메뉴가 늘거나 줄면 책상 수도 그만큼 늘고 준다(topology-scene.tsx에서 최대 3열
// 그리드로 배치). 하위 메뉴는 그 책상의 목록 자리에 그대로 나온다. 팀장 자리는
// "관리자 대시보드"(components/layout/admin-nav.ts, ADMIN_NAV)를 나타내는 좌석인데,
// 관리자로 로그인했을 때만 통째로 존재한다 — 그 외에는 좌석 자체가 배열에 없다
// (잠긴 채로 보여주지 않고 아예 안 보인다).

export type TopologyTint = "champagne" | "cognac" | "espresso"

export type TopologyItemNode = {
  id: string
  label: string
  meta: string | null
  href: string
}

export type TopologyModuleNode = {
  id: string
  label: string
  href: string
  tint: TopologyTint
  isLead: boolean
  restricted: boolean
  items: TopologyItemNode[]
}

export type TopologyData = {
  modules: TopologyModuleNode[]
}

const TINTS: TopologyTint[] = ["champagne", "cognac", "espresso"]
const MAX_ITEMS_PER_MODULE = 4
const ADMIN_MODULE_ID = "admin-dashboard"

function resolveHref(item: Pick<MenuItem, "href" | "boards">, fallback = "/") {
  if (item.boards?.slug) return `/b/${item.boards.slug}`
  return item.href?.trim() || fallback
}

function isVisible(item: MenuItem) {
  if (!item.is_active) return false
  if (item.board_id && item.boards?.is_active === false) return false
  return true
}

function buildAdminModule(t: (key: string) => string): TopologyModuleNode {
  // 이 함수는 관리자로 로그인했을 때만 호출된다 — 그 외에는 아예 목록에 넣지 않는다
  // (책상 자체가 안 보임. 잠긴 채로 보여주지 않는다).
  return {
    id: ADMIN_MODULE_ID,
    label: t("dashboard.adminMenu"),
    href: ADMIN_NAV[0]?.href ?? "/promptkit",
    tint: "espresso",
    isLead: true,
    restricted: false,
    items: ADMIN_NAV.slice(0, MAX_ITEMS_PER_MODULE).map((entry) => ({
      id: entry.href,
      label: t(entry.labelKey),
      meta: null,
      href: entry.href,
    })),
  }
}

export async function buildLandingTopology(): Promise<TopologyData> {
  const [allMenus, viewer] = await Promise.all([listAllMenus(), currentViewer()])
  const { t } = getT()

  const headerItems = allMenus.filter((item) => item.location === "header" && isVisible(item))
  const byParent = new Map<string | null, MenuItem[]>()
  for (const item of headerItems) {
    const list = byParent.get(item.parent_id) ?? []
    list.push(item)
    byParent.set(item.parent_id, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, "ko"))
  }

  const roots = byParent.get(null) ?? []

  const memberModules: TopologyModuleNode[] = roots.map((root, index) => {
    const children = byParent.get(root.id) ?? []
    const items: TopologyItemNode[] = children.slice(0, MAX_ITEMS_PER_MODULE).map((child) => ({
      id: child.id,
      label: child.label,
      meta: null,
      href: resolveHref(child),
    }))

    return {
      id: root.id,
      label: root.label,
      href: resolveHref(root, items[0]?.href ?? "/"),
      tint: TINTS[index % TINTS.length],
      isLead: false,
      restricted: false,
      items,
    }
  })

  // 요청사항: "관리자 메뉴와 로봇은 관리자가 로그인했을 때만 보이게 한다" — 관리자가
  // 아니면 이 좌석 자체를 배열에서 뺀다(잠긴 상태로도 보여주지 않음).
  const isOwner = roleAtLeast(viewer.role, "owner")
  const modules = isOwner ? [buildAdminModule(t), ...memberModules] : memberModules

  return { modules }
}

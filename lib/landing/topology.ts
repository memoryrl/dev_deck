import { ADMIN_NAV } from "@/components/layout/admin-nav"
import { publicMenus } from "@/components/layout/public-nav-data"
import { roleAtLeast } from "@/lib/access"
import { currentViewer } from "@/lib/boards/access"
import { getT } from "@/lib/i18n/dictionary"
import { listAllMenus } from "@/lib/menus/public"
import type { MenuItem } from "@/types/menu"

// "결국 루트 메뉴에 따라 로봇이 배정된다"는
// 방향에 맞춰, 하드코딩된 PromptKit/CareerLog/Steam 3개 대신 실제 헤더 루트 메뉴
// (devdeck.menus, location='header', parent_id=null)를 그대로 팀원 책상으로 그린다.
// 메뉴가 늘거나 줄면 책상 수도 그만큼 늘고 준다(topology-scene.tsx에서 한 행 4석,
// 마주보는 페어 2개). 하위 메뉴는 그 책상의 목록 자리에 그대로 나온다. 팀장 자리는
// "관리자 대시보드" 좌석이다. 관리자 로그인 시 로봇이 앉아 있고, 그 외에는 책상·모니터만
// 남기고 외근 팻말을 올린다.

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
  /** 관리자 자리: 비로그인·일반회원에게는 로봇 없이 책상만 두고 외근 팻말을 올린다 */
  vacant: boolean
  /** 로봇 말풍선 부연설명 (헤더 메가 메뉴와 동일한 카피) */
  guideDescription: string
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

function resolveModuleGuideDescription(
  label: string,
  t: (key: string) => string,
  isAdminModule: boolean,
): string {
  if (isAdminModule) return t("landing.moduleAdminGuide")
  const mega = publicMenus.find((menu) => t(menu.labelKey) === label)
  if (mega) return t(mega.highlight.bodyKey)
  return t("mega.fallbackBody")
}

// 관리자 대시보드 좌석. 관리자가 아니면 로봇만 빼고 책상·모니터는 남겨
// "외근중" 팻말을 올린다(방이 비어 보이지 않게).

function buildAdminModule(t: (key: string) => string, vacant: boolean): TopologyModuleNode {
  return {
    id: ADMIN_MODULE_ID,
    label: t("dashboard.adminMenu"),
    href: vacant ? "/" : (ADMIN_NAV[0]?.href ?? "/site/dashboard"),
    tint: "espresso",
    isLead: true,
    restricted: vacant,
    vacant,
    guideDescription: resolveModuleGuideDescription(t("dashboard.adminMenu"), t, true),
    items: vacant
      ? []
      : ADMIN_NAV.slice(0, MAX_ITEMS_PER_MODULE).map((entry) => ({
          id: entry.href,
          label: t(entry.labelKey),
          meta: null,
          href: entry.href,
        })),
  }
}

// 헤더 루트 메뉴(devdeck.menus, location='header', parent_id=null)를 팀원 모듈
// 목록으로 만든다. 토폴로지 3D 책상뿐 아니라 랜딩 페이지의 다른 섹션(모듈 마퀴 등)도
// 이 함수 하나를 같이 써서, 메뉴가 추가/변경되면 두 군데 다 자동으로 반영된다.
export async function listLandingModules(): Promise<TopologyModuleNode[]> {
  const allMenus = await listAllMenus()
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

  return roots.map((root, index) => {
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
      vacant: false,
      guideDescription: resolveModuleGuideDescription(root.label, t, false),
      items,
    }
  })
}

export async function buildLandingTopology(): Promise<TopologyData> {
  const [memberModules, viewer] = await Promise.all([listLandingModules(), currentViewer()])
  const { t } = getT()

  const isOwner = roleAtLeast(viewer.role, "owner")
  const modules = [buildAdminModule(t, !isOwner), ...memberModules]

  return { modules }
}

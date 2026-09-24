import { ADMIN_NAV } from "@/components/layout/admin-nav"
import { megaIdFromLabelKey, publicMenus } from "@/components/layout/public-nav-data"
import { resolveMenuLabelKey } from "@/lib/menus/label"
import type { NavNode } from "@/types/menu"

// 토폴로지(3D 오피스) 데이터 타입과, 서버·클라이언트 어디서나 쓸 수 있는 순수 빌더.
// Supabase를 만지는 서버 쪽 조립은 lib/landing/topology.ts에 있다. 헤더가 이미 가진
// 내비 트리(NavNode)로 같은 모양의 데이터를 클라이언트에서 만들 수 있어야 하는 이유는,
// 랜딩 밖 화면에서 메뉴를 눌렀을 때도 오버레이로 로봇 안내 연출을 띄우기 위해서다.

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

export const TOPOLOGY_TINTS: TopologyTint[] = ["champagne", "cognac", "espresso"]
export const MAX_ITEMS_PER_MODULE = 4
export const ADMIN_MODULE_ID = "admin-dashboard"

type Translate = (key: string) => string

export function resolveModuleGuideDescription(
  item: { label: string; label_key?: string | null },
  t: Translate,
  isAdminModule: boolean
): string {
  if (isAdminModule) return t("landing.moduleAdminGuide")
  const key = resolveMenuLabelKey({ label: item.label, labelKey: item.label_key })
  const megaId = megaIdFromLabelKey(key)
  const mega =
    publicMenus.find((menu) => menu.labelKey === key) ??
    publicMenus.find((menu) => menu.id === megaId) ??
    publicMenus.find((menu) => t(menu.labelKey) === item.label)
  if (mega) return t(mega.highlight.bodyKey)
  return t("mega.fallbackBody")
}

// 관리자 대시보드 좌석. 관리자가 아니면 로봇만 빼고 책상·모니터는 남겨
// "외근중" 팻말을 올린다(방이 비어 보이지 않게).
export function buildAdminModule(t: Translate, vacant: boolean): TopologyModuleNode {
  return {
    id: ADMIN_MODULE_ID,
    label: t("dashboard.adminMenu"),
    href: vacant ? "/" : (ADMIN_NAV[0]?.href ?? "/site/dashboard"),
    tint: "espresso",
    isLead: true,
    restricted: vacant,
    vacant,
    guideDescription: resolveModuleGuideDescription(
      { label: t("dashboard.adminMenu"), label_key: "dashboard.adminMenu" },
      t,
      true
    ),
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

/**
 * 헤더 내비 트리(라벨은 이미 현지화된 상태)로 토폴로지 데이터를 만든다 — 랜딩의
 * buildLandingTopology()와 같은 모양이라 같은 씬 컴포넌트에 그대로 넘길 수 있다.
 */
export function topologyFromNavNodes(nodes: NavNode[], owner: boolean, t: Translate): TopologyData {
  const members: TopologyModuleNode[] = nodes.map((node, index) => {
    const items: TopologyItemNode[] = node.children.slice(0, MAX_ITEMS_PER_MODULE).map((child) => ({
      id: child.id,
      label: child.label,
      meta: null,
      href: child.href,
    }))
    return {
      id: node.id,
      label: node.label,
      href: node.href?.trim() || items[0]?.href || "/",
      tint: TOPOLOGY_TINTS[index % TOPOLOGY_TINTS.length],
      isLead: false,
      restricted: false,
      vacant: false,
      guideDescription: resolveModuleGuideDescription({ label: node.label, label_key: node.labelKey }, t, false),
      items,
    }
  })
  return { modules: [buildAdminModule(t, !owner), ...members] }
}

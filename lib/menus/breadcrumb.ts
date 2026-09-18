import { cache } from "react"
import { headers } from "next/headers"
import { adminNavLabel, type AdminSidebarGroup } from "@/components/layout/admin-nav"
import { getT } from "@/lib/i18n/dictionary"
import { listAdminMenus } from "@/lib/menus/admin"
import { listNavMenus } from "@/lib/menus/public"
import type { NavNode } from "@/types/menu"

export type BreadcrumbItem = { label: string; href?: string }

type Candidate = {
  href: string
  items: BreadcrumbItem[]
}

function normalizePath(path: string) {
  const value = path.split("?")[0]?.split("#")[0] || "/"
  if (value.length > 1 && value.endsWith("/")) return value.slice(0, -1)
  return value || "/"
}

function pathMatches(path: string, href: string) {
  const current = normalizePath(path)
  const target = normalizePath(href)
  if (!target || target === "/") return current === "/"
  return current === target || current.startsWith(`${target}/`)
}

function fromAdmin(groups: AdminSidebarGroup[], path: string, t: (key: string) => string): Candidate[] {
  const matches: Candidate[] = []
  for (const group of groups) {
    const groupCrumb: BreadcrumbItem = {
      label: adminNavLabel(t, group),
      href: group.href || undefined,
    }
    if (group.href && pathMatches(path, group.href)) {
      matches.push({ href: group.href, items: [groupCrumb] })
    }
    for (const item of group.items) {
      if (!pathMatches(path, item.href)) continue
      matches.push({
        href: item.href,
        items: [groupCrumb, { label: adminNavLabel(t, item), href: item.href }],
      })
    }
  }
  return matches
}

function fromNav(nodes: NavNode[], path: string): Candidate[] {
  const matches: Candidate[] = []
  for (const node of nodes) {
    if (node.href && pathMatches(path, node.href)) {
      matches.push({ href: node.href, items: [{ label: node.label, href: node.href }] })
    }
    for (const child of node.children) {
      if (!pathMatches(path, child.href)) continue
      matches.push({
        href: child.href,
        items: [
          { label: node.label, href: node.href || undefined },
          { label: child.label, href: child.href },
        ],
      })
    }
  }
  return matches
}

function pickBest(candidates: Candidate[]) {
  return [...candidates].sort((a, b) => normalizePath(b.href).length - normalizePath(a.href).length)[0]
}

function extraAfterTrail(trail: BreadcrumbItem[], extra: BreadcrumbItem[]) {
  const last = trail[trail.length - 1]
  if (!last) return extra
  return extra.filter((item) => {
    if (item.href && last.href && normalizePath(item.href) === normalizePath(last.href)) return false
    if (item.label === last.label) return false
    return true
  })
}

function fallbackTrail(t: (key: string) => string, extra: BreadcrumbItem[], currentLabel?: string) {
  const home: BreadcrumbItem = { label: t("common.home"), href: "/" }
  if (extra.length > 0) {
    const last = extra[extra.length - 1]
    const rest = extra.slice(0, -1)
    return [home, ...rest, { label: last.label }]
  }
  if (currentLabel) return [home, { label: currentLabel }]
  return [home]
}

export async function resolveMenuBreadcrumb(
  path: string,
  extra: BreadcrumbItem[] = [],
  currentLabel?: string
): Promise<BreadcrumbItem[]> {
  const { t } = getT()
  const [admin, header, footer] = await Promise.all([
    listAdminMenus(),
    listNavMenus("header"),
    listNavMenus("footer"),
  ])
  const dashboard =
    path.startsWith("/site") ||
    path.startsWith("/promptkit") ||
    path.startsWith("/career") ||
    path.startsWith("/steam")
  const primary = dashboard ? fromAdmin(admin, path, t) : fromNav(header, path)
  const secondary = dashboard
    ? [...fromNav(header, path), ...fromNav(footer, path)]
    : [...fromAdmin(admin, path, t), ...fromNav(footer, path)]
  const best = pickBest([...primary, ...secondary])
  if (!best) return fallbackTrail(t, extra, currentLabel)

  const trail = [...best.items]
  const extras = extraAfterTrail(trail, extra)
  const exact = normalizePath(path) === normalizePath(best.href)

  if (extras.length === 0 && exact && trail.length > 0) {
    const last = trail[trail.length - 1]
    trail[trail.length - 1] = { label: last.label }
  }

  return [...trail, ...extras]
}

export const menuBreadcrumbForRequest = cache(async (extra: BreadcrumbItem[] = [], currentLabel?: string) => {
  const { t } = getT()
  const path = headers().get("x-pathname")?.trim()
  if (!path) return fallbackTrail(t, extra, currentLabel)
  return resolveMenuBreadcrumb(path, extra, currentLabel)
})

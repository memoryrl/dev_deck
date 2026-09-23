import { cache } from "react"
import { forgetMemoryCache, MEMORY_TTL, memoryKey, withMemoryCache } from "@/lib/cache/memory"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { AdminSidebarGroup } from "@/components/layout/admin-nav"
import { parseMenuLabels } from "@/lib/menus/label"
import { labelsFromKey } from "@/lib/menus/labels-seed"
import type { MenuItem } from "@/types/menu"

type AdminMenuSeed = {
  label: string
  labelKey: string
  href: string | null
  icon: string
  sortOrder: number
  children?: Omit<AdminMenuSeed, "children">[]
}

export const DEFAULT_ADMIN_MENU_TREE: AdminMenuSeed[] = [
  {
    label: "콘텐츠",
    labelKey: "nav.group.content",
    href: null,
    icon: "Layers",
    sortOrder: 0,
    children: [
      { label: "대시보드", labelKey: "nav.dashboard", href: "/site/dashboard", icon: "LayoutDashboard", sortOrder: 0 },
      { label: "PromptKit", labelKey: "nav.promptkit", href: "/promptkit", icon: "Sparkles", sortOrder: 10 },
      { label: "CareerLog", labelKey: "nav.career", href: "/career", icon: "Briefcase", sortOrder: 20 },
      { label: "Steam Tracker", labelKey: "nav.steam", href: "/steam", icon: "Gamepad2", sortOrder: 30 },
    ],
  },
  {
    label: "커뮤니티",
    labelKey: "nav.group.community",
    href: null,
    icon: "LayoutList",
    sortOrder: 10,
    children: [
      { label: "게시판", labelKey: "nav.boards", href: "/site/boards", icon: "LayoutList", sortOrder: 0 },
      { label: "댓글", labelKey: "nav.comments", href: "/site/comments", icon: "MessageSquare", sortOrder: 10 },
      { label: "메뉴", labelKey: "nav.menus", href: "/site/menus", icon: "Menu", sortOrder: 20 },
      { label: "업로드", labelKey: "nav.uploads", href: "/site/uploads", icon: "Upload", sortOrder: 30 },
    ],
  },
  {
    label: "운영",
    labelKey: "nav.group.ops",
    href: null,
    icon: "Shield",
    sortOrder: 20,
    children: [
      { label: "회원", labelKey: "nav.members", href: "/site/members", icon: "Users", sortOrder: 0 },
      { label: "접속 이력", labelKey: "nav.loginHistory", href: "/site/login-history", icon: "History", sortOrder: 10 },
      { label: "공유 링크", labelKey: "nav.shareLinks", href: "/site/shares", icon: "Share2", sortOrder: 15 },
      { label: "약관", labelKey: "nav.terms", href: "/site/terms", icon: "FileText", sortOrder: 17 },
      { label: "로컬 LLM 테스트", labelKey: "nav.ollamaChat", href: "/site/ollama-chat", icon: "Bot", sortOrder: 18 },
      { label: "포트폴리오 질문", labelKey: "nav.portfolioAsks", href: "/site/portfolio-asks", icon: "MessageCircle", sortOrder: 19 },
      { label: "설정", labelKey: "nav.settings", href: "/site/settings", icon: "Settings", sortOrder: 20 },
      { label: "시스템", labelKey: "nav.system", href: "/site/system", icon: "Monitor", sortOrder: 30 },
    ],
  },
  {
    label: "디자인 시스템",
    labelKey: "nav.group.design",
    href: null,
    icon: "Palette",
    sortOrder: 30,
    children: [
      { label: "공통영역", labelKey: "nav.designSystemCommon", href: "/site/design-system/common", icon: "Palette", sortOrder: 0 },
      { label: "화면영역", labelKey: "nav.designSystemScreens", href: "/site/design-system/screens", icon: "LayoutTemplate", sortOrder: 10 },
    ],
  },
]

const ICON_BY_HREF: Record<string, string> = Object.fromEntries(
  DEFAULT_ADMIN_MENU_TREE.flatMap((group) =>
    (group.children ?? []).map((child) => [child.href ?? "", child.icon])
  ).filter((entry) => entry[0])
)

function iconOf(item: Pick<MenuItem, "icon" | "href">, fallback = "LayoutDashboard") {
  return item.icon || (item.href ? ICON_BY_HREF[item.href] : null) || fallback
}

export function defaultAdminMenuGroups(): AdminSidebarGroup[] {
  return DEFAULT_ADMIN_MENU_TREE.map((group) => ({
    id: `default-${group.labelKey}`,
    label: group.label,
    labelKey: group.labelKey,
    labels: labelsFromKey(group.label, group.labelKey),
    iconName: group.icon,
    href: group.href,
    items: (group.children ?? [])
      .filter((child): child is typeof child & { href: string } => Boolean(child.href))
      .map((child) => ({
        id: `default-${child.labelKey}`,
        label: child.label,
        labelKey: child.labelKey,
        labels: labelsFromKey(child.label, child.labelKey),
        href: child.href,
        iconName: child.icon,
      })),
  }))
}

function groupsFromRows(rows: MenuItem[]): AdminSidebarGroup[] {
  const childrenOf = new Map<string | null, MenuItem[]>()
  for (const item of rows) {
    const key = item.parent_id
    const list = childrenOf.get(key) ?? []
    list.push(item)
    childrenOf.set(key, list)
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, "ko"))
  }

  return (childrenOf.get(null) ?? []).flatMap((root) => {
    const children = (childrenOf.get(root.id) ?? [])
      .map((child) => {
        const href = child.href?.trim()
        if (!href) return null
        return {
          id: child.id,
          label: child.label,
          labelKey: child.label_key,
          labels: parseMenuLabels(child.labels, child.label),
          href,
          iconName: iconOf(child),
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    if (children.length === 0 && !root.href) return []

    return [
      {
        id: root.id,
        label: root.label,
        labelKey: root.label_key,
        labels: parseMenuLabels(root.labels, root.label),
        iconName: iconOf(root, "Layers"),
        href: root.href,
        items: children,
      },
    ]
  })
}

type MenuWriteClient = Awaited<ReturnType<typeof createClient>>

async function insertMenuRow(
  supabase: MenuWriteClient,
  payload: Record<string, unknown>
): Promise<{ id: string } | { error: string }> {
  const attempts = [
    payload,
    omitKeys(payload, ["labels"]),
    omitKeys(payload, ["labels", "label_key", "icon"]),
  ]
  let lastError = "insert failed"
  for (const body of attempts) {
    const result = await supabase.from("menus").insert(body).select("id").single()
    if (!result.error && result.data?.id) return { id: result.data.id }
    lastError = result.error?.message ?? lastError
    if (!result.error) break
    const missingExtra = /label_key|icon|labels/.test(result.error.message)
    if (!missingExtra) return { error: result.error.message }
  }
  return { error: lastError }
}

function omitKeys(payload: Record<string, unknown>, keys: string[]) {
  const next = { ...payload }
  for (const key of keys) delete next[key]
  return next
}

export const listAdminMenus = cache(async (): Promise<AdminSidebarGroup[]> => {
  if (!isSupabaseConfigured()) return defaultAdminMenuGroups()

  return withMemoryCache(memoryKey.menus("admin"), MEMORY_TTL.menus, async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .eq("location", "admin")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (error || !data || data.length === 0) {
      return defaultAdminMenuGroups()
    }

    const groups = groupsFromRows(data as MenuItem[])
    return groups.length > 0 ? groups : defaultAdminMenuGroups()
  })
})

export async function ensureAdminMenus(): Promise<{ seeded: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { seeded: false, error: "not_configured" }

  const alreadySeeded = await withMemoryCache(memoryKey.adminMenusSeeded, MEMORY_TTL.menusSeeded, async () => {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from("menus")
      .select("*", { count: "exact", head: true })
      .eq("location", "admin")
    if (error) return false
    return (count ?? 0) > 0
  })
  if (alreadySeeded) return { seeded: false }

  const supabase = await createClient()
  const { count, error: countError } = await supabase
    .from("menus")
    .select("*", { count: "exact", head: true })
    .eq("location", "admin")

  if (countError) return { seeded: false, error: countError.message }
  if ((count ?? 0) > 0) {
    forgetMemoryCache(memoryKey.adminMenusSeeded)
    await withMemoryCache(memoryKey.adminMenusSeeded, MEMORY_TTL.menusSeeded, async () => true)
    return { seeded: false }
  }

  for (const parent of DEFAULT_ADMIN_MENU_TREE) {
    const inserted = await insertMenuRow(supabase, {
      label: parent.label,
      label_key: parent.labelKey,
      labels: labelsFromKey(parent.label, parent.labelKey),
      href: parent.href,
      icon: parent.icon,
      location: "admin",
      view_role: "owner",
      is_active: true,
      sort_order: parent.sortOrder,
      parent_id: null,
      board_id: null,
    })
    if ("error" in inserted) return { seeded: false, error: inserted.error }

    const children = parent.children ?? []
    if (children.length === 0) continue

    for (const child of children) {
      const childInserted = await insertMenuRow(supabase, {
        label: child.label,
        label_key: child.labelKey,
        labels: labelsFromKey(child.label, child.labelKey),
        href: child.href,
        icon: child.icon,
        location: "admin",
        view_role: "owner",
        is_active: true,
        sort_order: child.sortOrder,
        parent_id: inserted.id,
        board_id: null,
      })
      if ("error" in childInserted) return { seeded: false, error: childInserted.error }
    }
  }

  forgetMemoryCache("menus")
  forgetMemoryCache(memoryKey.adminMenusSeeded)
  await withMemoryCache(memoryKey.adminMenusSeeded, MEMORY_TTL.menusSeeded, async () => true)
  return { seeded: true }
}

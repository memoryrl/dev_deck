import { cache } from "react"
import { MEMORY_TTL, memoryKey, withMemoryCache } from "@/lib/cache/memory"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { MenuItem } from "@/types/menu"

export type AdminMenuItem = {
  id: string
  label: string
  href: string
  iconName: string
  sortOrder: number
}

const ICON_NAME_MAP: Record<string, string> = {
  "/site/dashboard": "LayoutDashboard",
  "/promptkit": "Sparkles",
  "/career": "Briefcase",
  "/steam": "Gamepad2",
  "/site/boards": "LayoutList",
  "/site/comments": "MessageSquare",
  "/site/menus": "Menu",
  "/site/uploads": "Upload",
  "/site/members": "Users",
  "/site/login-history": "History",
  "/site/settings": "Settings",
  "/site/system": "Monitor",
  "/site/design-system/common": "Palette",
}

const DEFAULT_ADMIN_MENUS: AdminMenuItem[] = [
  { id: "default-1", label: "nav.dashboard", href: "/site/dashboard", iconName: "LayoutDashboard", sortOrder: 0 },
  { id: "default-2", label: "nav.promptkit", href: "/promptkit", iconName: "Sparkles", sortOrder: 10 },
  { id: "default-3", label: "nav.career", href: "/career", iconName: "Briefcase", sortOrder: 20 },
  { id: "default-4", label: "nav.steam", href: "/steam", iconName: "Gamepad2", sortOrder: 30 },
  { id: "default-5", label: "nav.boards", href: "/site/boards", iconName: "LayoutList", sortOrder: 40 },
  { id: "default-6", label: "nav.comments", href: "/site/comments", iconName: "MessageSquare", sortOrder: 50 },
  { id: "default-7", label: "nav.menus", href: "/site/menus", iconName: "Menu", sortOrder: 60 },
  { id: "default-8", label: "nav.uploads", href: "/site/uploads", iconName: "Upload", sortOrder: 70 },
  { id: "default-9", label: "nav.members", href: "/site/members", iconName: "Users", sortOrder: 80 },
  { id: "default-10", label: "nav.loginHistory", href: "/site/login-history", iconName: "History", sortOrder: 90 },
  { id: "default-11", label: "nav.settings", href: "/site/settings", iconName: "Settings", sortOrder: 100 },
  { id: "default-12", label: "nav.system", href: "/site/system", iconName: "Monitor", sortOrder: 110 },
  { id: "default-13", label: "nav.designSystem", href: "/site/design-system/common", iconName: "Palette", sortOrder: 120 },
]

export const listAdminMenus = cache(async (): Promise<AdminMenuItem[]> => {
  if (!isSupabaseConfigured()) return DEFAULT_ADMIN_MENUS

  return withMemoryCache(memoryKey.menus("admin"), MEMORY_TTL.menus, async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("menus")
      .select("id, label, href, sort_order")
      .eq("location", "admin")
      .eq("is_active", true)
      .is("parent_id", null)
      .order("sort_order", { ascending: true })

    if (error || !data || data.length === 0) {
      return DEFAULT_ADMIN_MENUS
    }

    return (data as Pick<MenuItem, "id" | "label" | "href" | "sort_order">[])
      .filter((item) => item.href)
      .map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href!,
        iconName: ICON_NAME_MAP[item.href!] ?? "LayoutDashboard",
        sortOrder: item.sort_order,
      }))
  })
})

export async function seedAdminMenus(): Promise<{ seeded: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { seeded: false, error: "not_configured" }

  const supabase = createClient()

  const { count, error: countError } = await supabase
    .from("menus")
    .select("*", { count: "exact", head: true })
    .eq("location", "admin")

  if (countError) return { seeded: false, error: countError.message }
  if ((count ?? 0) > 0) return { seeded: false, error: "already_exists" }

  const menuData = DEFAULT_ADMIN_MENUS.map((menu) => ({
    label: menu.label,
    href: menu.href,
    location: "admin" as const,
    view_role: "owner" as const,
    is_active: true,
    sort_order: menu.sortOrder,
    parent_id: null,
    board_id: null,
  }))

  const { error: insertError } = await supabase.from("menus").insert(menuData)

  if (insertError) return { seeded: false, error: insertError.message }
  return { seeded: true }
}

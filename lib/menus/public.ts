import { cache } from "react"
import type { AccessRole } from "@/lib/access"
import { roleAtLeast } from "@/lib/access"
import { MEMORY_TTL, memoryKey, withMemoryCache } from "@/lib/cache/memory"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import { treeMenus } from "@/lib/menus/resolve"
import type { MenuItem, MenuLocation, NavNode } from "@/types/menu"

const listActiveMenuRows = cache(async (location: MenuLocation): Promise<MenuItem[]> => {
  if (!isSupabaseConfigured()) return []
  return withMemoryCache(memoryKey.menus(location), MEMORY_TTL.menus, async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("menus")
      .select("*, boards(slug, name, is_active)")
      .eq("location", location)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
    if (error) return []
    return (data as MenuItem[]) ?? []
  })
})

/** location별 활성 메뉴를 역할(view_role)에 맞게 트리로 반환 */
export async function listNavMenus(
  location: MenuLocation,
  role: AccessRole = "visitor"
): Promise<NavNode[]> {
  const rows = await listActiveMenuRows(location)
  return treeMenus(rows.filter((row) => roleAtLeast(role, row.view_role)))
}

export async function listAllMenus(): Promise<MenuItem[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("menus")
    .select("*, boards(slug, name, is_active)")
    .order("location", { ascending: true })
    .order("sort_order", { ascending: true })
  if (error) return []
  return (data as MenuItem[]) ?? []
}

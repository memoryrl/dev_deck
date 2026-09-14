import { cache } from "react"
import { MEMORY_TTL, memoryKey, withMemoryCache } from "@/lib/cache/memory"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import { treeMenus } from "@/lib/menus/resolve"
import type { MenuItem, MenuLocation, NavNode } from "@/types/menu"

export const listNavMenus = cache(async (location: MenuLocation): Promise<NavNode[]> => {
  if (!isSupabaseConfigured()) return []
  return withMemoryCache(memoryKey.menus(location), MEMORY_TTL.menus, async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("menus")
      .select("*, boards(slug, name, is_active)")
      .eq("location", location)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
    if (error) return []
    return treeMenus((data as MenuItem[]) ?? [])
  })
})

export async function listAllMenus(): Promise<MenuItem[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from("menus")
    .select("*, boards(slug, name, is_active)")
    .order("location", { ascending: true })
    .order("sort_order", { ascending: true })
  if (error) return []
  return (data as MenuItem[]) ?? []
}

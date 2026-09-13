import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import { treeMenus } from "@/lib/menus/resolve"
import type { MenuItem, MenuLocation, NavNode } from "@/types/menu"

export async function listNavMenus(location: MenuLocation): Promise<NavNode[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from("menus")
    .select("*, boards(slug, name, is_active)")
    .eq("location", location)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
  if (error) return []
  return treeMenus((data as MenuItem[]) ?? [])
}

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

import { canViewSystemBoard } from "@/lib/boards/access"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { CareerPost, CareerSkill } from "@/types/career"

export const PUBLIC_CAREER_TEASER_LIMIT = 6

export async function listPublicCareerPosts(): Promise<CareerPost[]> {
  if (!isSupabaseConfigured()) return []
  if (!(await canViewSystemBoard("career"))) return []
  const supabase = createClient()
  const { data } = await supabase
    .from("career_posts")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
  return (data as CareerPost[]) ?? []
}

export async function listRecentPublicCareerPosts(limit = PUBLIC_CAREER_TEASER_LIMIT): Promise<CareerPost[]> {
  const posts = await listPublicCareerPosts()
  return posts.slice(0, limit)
}

export async function getPublicCareerPostById(id: string): Promise<CareerPost | null> {
  if (!isSupabaseConfigured()) return null
  if (!(await canViewSystemBoard("career"))) return null
  const supabase = createClient()
  const { data } = await supabase
    .from("career_posts")
    .select("*")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle()
  return (data as CareerPost | null) ?? null
}

export async function listPublicCareerSkills(): Promise<CareerSkill[]> {
  if (!isSupabaseConfigured()) return []
  if (!(await canViewSystemBoard("career"))) return []
  const supabase = createClient()
  const { data } = await supabase
    .from("career_skills")
    .select("*")
    .eq("is_public", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
  return (data as CareerSkill[]) ?? []
}

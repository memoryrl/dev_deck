import { cache } from "react"
import { canViewSystemBoard, currentAccessRole } from "@/lib/boards/access"
import { MEMORY_TTL, memoryKey, withMemoryCache } from "@/lib/cache/memory"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { CareerPost, CareerSkill } from "@/types/career"

export const PUBLIC_CAREER_TEASER_LIMIT = 6
export const PUBLIC_SKILL_LIMIT = 8

const CAREER_LIST_SELECT =
  "id, title, excerpt, post_type, company, role, period_start, period_end, skills, tags, is_public, created_at, updated_at"
const SKILL_LIST_SELECT = "id, name, category, proficiency, years, summary, is_public, sort_order, created_at, updated_at"

function asCareerListItem(row: Omit<CareerPost, "content" | "user_id">): CareerPost {
  return { ...row, user_id: "", content: "" }
}

function asSkillListItem(row: Omit<CareerSkill, "user_id">): CareerSkill {
  return { ...row, user_id: "" }
}

export const listPublicCareerPosts = cache(async (limit?: number): Promise<CareerPost[]> => {
  if (!isSupabaseConfigured()) return []
  if (!(await canViewSystemBoard("career"))) return []
  const role = await currentAccessRole()
  const key = limit ? `${memoryKey.career(role)}:${limit}` : memoryKey.career(role)
  return withMemoryCache(key, MEMORY_TTL.publicList, async () => {
    const supabase = createClient()
    let query = supabase
      .from("career_posts")
      .select(CAREER_LIST_SELECT)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
    if (limit) query = query.limit(limit)
    const { data } = await query
    return ((data as Omit<CareerPost, "content" | "user_id">[]) ?? []).map(asCareerListItem)
  })
})

export async function listRecentPublicCareerPosts(limit = PUBLIC_CAREER_TEASER_LIMIT): Promise<CareerPost[]> {
  return listPublicCareerPosts(limit)
}

export const countPublicCareerPosts = cache(async (): Promise<number> => {
  if (!isSupabaseConfigured()) return 0
  if (!(await canViewSystemBoard("career"))) return 0
  const role = await currentAccessRole()
  return withMemoryCache(`${memoryKey.career(role)}:count`, MEMORY_TTL.publicList, async () => {
    const supabase = createClient()
    const { count } = await supabase
      .from("career_posts")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true)
    return count ?? 0
  })
})

export const getFeaturedPublicCareer = cache(async (): Promise<CareerPost | null> => {
  if (!isSupabaseConfigured()) return null
  if (!(await canViewSystemBoard("career"))) return null
  const role = await currentAccessRole()
  return withMemoryCache(`${memoryKey.career(role)}:featured`, MEMORY_TTL.publicList, async () => {
    const supabase = createClient()
    const { data: project } = await supabase
      .from("career_posts")
      .select(CAREER_LIST_SELECT)
      .eq("is_public", true)
      .eq("post_type", "project")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (project) return asCareerListItem(project as Omit<CareerPost, "content" | "user_id">)
    const { data: latest } = await supabase
      .from("career_posts")
      .select(CAREER_LIST_SELECT)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    return latest ? asCareerListItem(latest as Omit<CareerPost, "content" | "user_id">) : null
  })
})

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

export const listPublicCareerSkills = cache(async (limit?: number): Promise<CareerSkill[]> => {
  if (!isSupabaseConfigured()) return []
  if (!(await canViewSystemBoard("career"))) return []
  const role = await currentAccessRole()
  const key = limit ? `${memoryKey.skills(role)}:${limit}` : memoryKey.skills(role)
  return withMemoryCache(key, MEMORY_TTL.publicList, async () => {
    const supabase = createClient()
    let query = supabase
      .from("career_skills")
      .select(SKILL_LIST_SELECT)
      .eq("is_public", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
    if (limit) query = query.limit(limit)
    const { data } = await query
    return ((data as Omit<CareerSkill, "user_id">[]) ?? []).map(asSkillListItem)
  })
})

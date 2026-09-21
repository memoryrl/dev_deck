import { cache } from "react"
import { canViewSystemBoard, currentAccessRole } from "@/lib/boards/access"
import { MEMORY_TTL, memoryKey, withMemoryCache } from "@/lib/cache/memory"
import {
  emptyPage,
  fetchPagedRows,
  ilikeContains,
  LIST_PAGE_SIZE,
  type PagedResult,
} from "@/lib/pagination"
import { resolvePromptThumbnail } from "@/lib/embeds/result-preview"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Prompt } from "@/types/prompt"

export const PUBLIC_PROMPT_LIMIT = 6

const PROMPT_LIST_SELECT = "id, title, category, tags, is_public, created_at, updated_at, result_html"

function asPromptListItem(row: Omit<Prompt, "content" | "user_id">): Prompt {
  return { ...row, user_id: "", content: "", result_html: row.result_html ?? "", thumbnailUrl: null }
}

export async function withPromptThumbnails(prompts: Prompt[]): Promise<Prompt[]> {
  return Promise.all(
    prompts.map(async (prompt) => ({
      ...prompt,
      thumbnailUrl: await resolvePromptThumbnail(prompt.result_html),
    }))
  )
}

export const listPublicPrompts = cache(async (limit?: number): Promise<Prompt[]> => {
  if (!isSupabaseConfigured()) return []
  if (!(await canViewSystemBoard("prompts"))) return []
  const role = await currentAccessRole()
  const key = limit ? `${memoryKey.prompts(role)}:${limit}` : memoryKey.prompts(role)
  return withMemoryCache(key, MEMORY_TTL.publicList, async () => {
    const supabase = await createClient()
    let query = supabase
      .from("prompts")
      .select(PROMPT_LIST_SELECT)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
    if (limit) query = query.limit(limit)
    const { data } = await query
    return ((data as Omit<Prompt, "content" | "user_id">[]) ?? []).map(asPromptListItem)
  })
})

export async function listRecentPublicPrompts(limit = PUBLIC_PROMPT_LIMIT): Promise<Prompt[]> {
  return listPublicPrompts(limit)
}

export async function listPromptsPage({
  page,
  q = "",
  publicOnly = false,
}: {
  page: number
  q?: string
  publicOnly?: boolean
}): Promise<PagedResult<Prompt>> {
  if (!isSupabaseConfigured()) return emptyPage(page)
  if (publicOnly && !(await canViewSystemBoard("prompts"))) return emptyPage(page)
  const supabase = await createClient()
  const needle = q.trim()
  return fetchPagedRows(page, LIST_PAGE_SIZE, async (from, to) => {
    let query = supabase
      .from("prompts")
      .select(PROMPT_LIST_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
    if (publicOnly) query = query.eq("is_public", true)
    if (needle) query = query.ilike("title", ilikeContains(needle))
    const { data, error, count } = await query.range(from, to)
    if (error) return null
    return {
      rows: ((data as Omit<Prompt, "content" | "user_id">[]) ?? []).map(asPromptListItem),
      total: count ?? 0,
    }
  })
}

export const countPublicPrompts = cache(async (): Promise<number> => {
  if (!isSupabaseConfigured()) return 0
  if (!(await canViewSystemBoard("prompts"))) return 0
  const role = await currentAccessRole()
  return withMemoryCache(`${memoryKey.prompts(role)}:count`, MEMORY_TTL.publicList, async () => {
    const supabase = await createClient()
    const { count } = await supabase
      .from("prompts")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true)
    return count ?? 0
  })
})

export async function getPublicPromptById(id: string): Promise<Prompt | null> {
  if (!isSupabaseConfigured()) return null
  if (!(await canViewSystemBoard("prompts"))) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from("prompts")
    .select("*")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle()
  const row = data as Prompt | null
  if (!row) return null
  return { ...row, result_html: row.result_html ?? "" }
}

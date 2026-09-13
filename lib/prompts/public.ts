import { canViewSystemBoard } from "@/lib/boards/access"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Prompt } from "@/types/prompt"

export const PUBLIC_PROMPT_LIMIT = 6

export async function listPublicPrompts(): Promise<Prompt[]> {
  if (!isSupabaseConfigured()) return []
  if (!(await canViewSystemBoard("prompts"))) return []
  const supabase = createClient()
  const { data } = await supabase
    .from("prompts")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
  return (data as Prompt[]) ?? []
}

export async function listRecentPublicPrompts(limit = PUBLIC_PROMPT_LIMIT): Promise<Prompt[]> {
  const prompts = await listPublicPrompts()
  return prompts.slice(0, limit)
}

export async function getPublicPromptById(id: string): Promise<Prompt | null> {
  if (!isSupabaseConfigured()) return null
  if (!(await canViewSystemBoard("prompts"))) return null
  const supabase = createClient()
  const { data } = await supabase
    .from("prompts")
    .select("*")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle()
  return (data as Prompt | null) ?? null
}

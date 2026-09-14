import { nestComments } from "@/lib/comments/tree"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Comment, CommentNode, CommentTargetType, ProfanityWord } from "@/types/comment"

export async function listComments(targetType: CommentTargetType, targetId: string): Promise<CommentNode[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: true })
  if (error) return []
  return nestComments((data as Comment[]) ?? [])
}

export async function listAllComments(): Promise<Comment[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createClient()
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(400)
  if (error) return []
  return (data as Comment[]) ?? []
}

export async function listProfanityWords(): Promise<ProfanityWord[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = createClient()
  const { data, error } = await supabase.from("profanity_words").select("*").order("word", { ascending: true })
  if (error) return []
  return (data as ProfanityWord[]) ?? []
}

export function commentTargetHref(type: CommentTargetType, id: string, boardSlug?: string | null) {
  if (type === "prompt") return `/p/${id}`
  if (type === "career") return `/work/${id}`
  if (type === "steam") return `/games/${id}`
  if (boardSlug) return `/b/${boardSlug}/${id}`
  return `/b`
}

export function commentTargetLabel(type: CommentTargetType) {
  if (type === "prompt") return "프롬프트"
  if (type === "career") return "커리어"
  if (type === "steam") return "게임"
  return "게시글"
}

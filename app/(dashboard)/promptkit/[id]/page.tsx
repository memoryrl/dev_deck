import { notFound } from "next/navigation"
import { PromptForm } from "../prompt-form"
import { PostPager } from "@/components/board/post-pager"
import { findNeighbors } from "@/lib/posts/neighbors"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Prompt } from "@/types/prompt"

export default async function PromptDetailPage({
  params,
}: {
  params: { id: string }
}) {
  if (!isSupabaseConfigured()) notFound()
  const supabase = createClient()
  const { data } = await supabase.from("prompts").select("*").eq("id", params.id).maybeSingle()
  const prompt = data as Prompt | null
  if (!prompt) notFound()
  const { data: rows } = await supabase.from("prompts").select("id, title").order("created_at", { ascending: false })
  const neighbors = findNeighbors(
    (rows as { id: string; title: string }[]) ?? [],
    prompt.id,
    (item) => item.id,
    (item) => `/promptkit/${item.id}`,
    (item) => item.title
  )

  return (
    <div className="mx-auto max-w-3xl">
      <PostPager listHref="/promptkit" {...neighbors} />
      <h1 className="mb-6 mt-6 font-display text-3xl font-extrabold">프롬프트 수정</h1>
      <PromptForm prompt={prompt} />
      <PostPager placement="bottom" listHref="/promptkit" {...neighbors} />
    </div>
  )
}

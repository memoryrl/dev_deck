import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Prompt } from "@/types/prompt"
import { PromptForm } from "../prompt-form"

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

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-3xl font-extrabold">프롬프트 수정</h1>
      <PromptForm prompt={prompt} />
    </div>
  )
}

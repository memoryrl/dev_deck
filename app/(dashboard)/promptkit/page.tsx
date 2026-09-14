import { PromptForm } from "./prompt-form"
import { PostList } from "@/components/board/post-list"
import { Card } from "@/components/ui/card"
import { createClient, ensureProfile } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Prompt } from "@/types/prompt"

export default async function PromptKitPage() {
  let prompts: Prompt[] = []
  if (isSupabaseConfigured()) {
    await ensureProfile()
    const supabase = createClient()
    const { data } = await supabase.from("prompts").select("*").order("created_at", { ascending: false })
    prompts = (data as Prompt[]) ?? []
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold">PromptKit</h1>
      </div>
      <Card>
        <h2 className="mb-4 font-display text-xl font-bold">새 프롬프트</h2>
        <PromptForm />
      </Card>
      <PostList
        searchable
        empty="첫 프롬프트를 저장하세요."
        items={prompts.map((prompt) => ({
          href: `/promptkit/${prompt.id}`,
          title: prompt.title,
          createdAt: prompt.created_at,
          meta: [prompt.category, prompt.is_public ? "공개" : "비공개"].filter(Boolean).join(" · "),
        }))}
      />
    </div>
  )
}

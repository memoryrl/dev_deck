import Link from "next/link"
import { CopyButton } from "@/components/layout/copy-button"
import { plainTextFromContent } from "@/lib/content"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient, ensureProfile } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Prompt } from "@/types/prompt"
import { PromptForm } from "./prompt-form"

export default async function PromptKitPage() {
  let prompts: Prompt[] = []
  if (isSupabaseConfigured()) {
    await ensureProfile()
    const supabase = createClient()
    const { data } = await supabase
      .from("prompts")
      .select("*")
      .order("created_at", { ascending: false })
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
      {prompts.length === 0 ? (
        <p className="text-sm text-muted-foreground">첫 프롬프트를 저장하세요.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {prompts.map((prompt) => (
            <Card key={prompt.id}>
              <div className="flex items-center gap-2">
                <Badge>{prompt.category}</Badge>
                {prompt.is_public ? <Badge variant="secondary">공개</Badge> : null}
              </div>
              <h3 className="mt-3 font-display text-xl font-bold">{prompt.title}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <CopyButton text={plainTextFromContent(prompt.content) || prompt.content} />
                <Link href={`/promptkit/${prompt.id}`}>
                  <Button variant="outline">상세</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

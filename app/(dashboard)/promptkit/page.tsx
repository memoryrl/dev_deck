import { Suspense } from "react"
import { PromptForm } from "./prompt-form"
import { PostList } from "@/components/board/post-list"
import { ListSkeleton } from "@/components/layout/skeletons"
import { Card } from "@/components/ui/card"
import { parseListPage, parseSearchQuery } from "@/lib/pagination"
import { listPromptsPage } from "@/lib/prompts/public"
import { ensureProfile } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export default function PromptKitPage({
  searchParams,
}: {
  searchParams?: { page?: string; q?: string }
}) {
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold">PromptKit</h1>
      </div>
      <Card>
        <h2 className="mb-4 font-display text-xl font-bold">새 프롬프트</h2>
        <PromptForm />
      </Card>
      <Suspense fallback={<ListSkeleton />}>
        <PromptKitList page={page} q={q} />
      </Suspense>
    </div>
  )
}

async function PromptKitList({ page, q }: { page: number; q: string }) {
  if (isSupabaseConfigured()) await ensureProfile()
  const prompts = await listPromptsPage({ page, q })
  return (
    <PostList
      searchable
      pathname="/promptkit"
      searchQuery={q}
      paged={prompts}
      empty="첫 프롬프트를 저장하세요."
      items={prompts.rows.map((prompt) => ({
        href: `/promptkit/${prompt.id}`,
        title: prompt.title,
        createdAt: prompt.created_at,
        meta: [prompt.category, prompt.is_public ? "공개" : "비공개"].filter(Boolean).join(" · "),
      }))}
    />
  )
}

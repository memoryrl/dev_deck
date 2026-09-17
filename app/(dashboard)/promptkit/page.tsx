import { Suspense } from "react"
import { PromptForm } from "./prompt-form"
import { PostList } from "@/components/board/post-list"
import { WriteForm, WritePanel, WriteToggle } from "@/components/board/write-panel"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
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
      <PageTitleBanner title="PromptKit" />
      <WritePanel label="새 프롬프트" closeLabel="접기">
        <div className="flex justify-end">
          <WriteToggle />
        </div>
        <WriteForm>
          <PromptForm />
        </WriteForm>
      </WritePanel>
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

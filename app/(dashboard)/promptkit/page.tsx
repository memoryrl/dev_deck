import { Suspense } from "react"
import { PromptForm } from "./prompt-form"
import { PostList } from "@/components/board/post-list"
import { WriteForm, WritePanel, WriteToggle } from "@/components/board/write-panel"
import { DatedCalendarServer as DatedCalendar } from "@/components/schedule/dated-calendar-server"
import { DateViewTabs, parseDateView } from "@/components/schedule/view-tabs"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
import { parseListPage, parseSearchQuery } from "@/lib/pagination"
import { listPromptsPage } from "@/lib/prompts/public"
import { ensureProfile } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "PromptKit 관리 · DevDeck", robots: { index: false, follow: false } }

export default async function PromptKitPage(
  props: {
    searchParams?: Promise<{ page?: string; q?: string; view?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)
  const view = parseDateView(searchParams?.view)

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner title="PromptKit" />
      <WritePanel label="새 프롬프트" closeLabel="접기">
        <div className="flex justify-end">
          <WriteToggle />
        </div>
        <WriteForm>
          <PromptForm />
        </WriteForm>
      </WritePanel>
      <DateViewTabs basePath="/promptkit" view={view} />
      {view === "calendar" ? (
        <DatedCalendar source="prompts" emptyHint="이 날짜에 만든 프롬프트가 없습니다." />
      ) : (
        <Suspense fallback={<ListSkeleton />}>
          <PromptKitList page={page} q={q} />
        </Suspense>
      )}
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
      extraParams={{ view: "list" }}
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

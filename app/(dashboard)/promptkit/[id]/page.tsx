import { Suspense } from "react"
import { notFound } from "next/navigation"
import { PromptForm } from "../prompt-form"
import { PostPager } from "@/components/board/post-pager"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { EditorFormSkeleton, PagerSkeleton } from "@/components/layout/skeletons"
import { findNeighbors } from "@/lib/posts/neighbors"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Prompt } from "@/types/prompt"
import { ShareButton } from "@/components/share/share-button"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "프롬프트 수정 · DevDeck", robots: { index: false, follow: false } }

export default async function PromptDetailPage(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params;
  return (
    <div className="w-full">
      <PageTitleBanner
        title="프롬프트 수정"
        breadcrumb={[{ label: "프롬프트 수정" }]}
        actions={<ShareButton targetType="prompt" targetId={params.id} />}
        className="mt-6"
      />
      <Suspense fallback={<PagerSkeleton className="mb-6 mt-6" />}>
        <NeighborsPager id={params.id} className="mb-6 mt-6" />
      </Suspense>
      <Suspense fallback={<EditorFormSkeleton />}>
        <PromptFormSection id={params.id} />
      </Suspense>
      <Suspense fallback={<PagerSkeleton className="mt-10" />}>
        <NeighborsPager id={params.id} placement="bottom" />
      </Suspense>
    </div>
  )
}

async function NeighborsPager({ id, placement, className }: { id: string; placement?: "bottom"; className?: string }) {
  if (!isSupabaseConfigured()) return <PostPager className={className} listHref="/promptkit" placement={placement} />
  const supabase = await createClient()
  const { data: rows } = await supabase.from("prompts").select("id, title").order("created_at", { ascending: false })
  const neighbors = findNeighbors(
    (rows as { id: string; title: string }[]) ?? [],
    id,
    (item) => item.id,
    (item) => `/promptkit/${item.id}`,
    (item) => item.title
  )
  return <PostPager className={className} listHref="/promptkit" placement={placement} {...neighbors} />
}

async function PromptFormSection({ id }: { id: string }) {
  if (!isSupabaseConfigured()) notFound()
  const supabase = await createClient()
  const { data } = await supabase.from("prompts").select("*").eq("id", id).maybeSingle()
  const prompt = data as Prompt | null
  if (!prompt) notFound()
  return <PromptForm prompt={prompt} />
}

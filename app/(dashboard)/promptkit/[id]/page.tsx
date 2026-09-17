import { Suspense } from "react"
import { notFound } from "next/navigation"
import { PromptForm } from "../prompt-form"
import { PostPager } from "@/components/board/post-pager"
import { EditorFormSkeleton, PagerSkeleton } from "@/components/layout/skeletons"
import { findNeighbors } from "@/lib/posts/neighbors"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { Prompt } from "@/types/prompt"

export default function PromptDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={<PagerSkeleton />}>
        <NeighborsPager id={params.id} />
      </Suspense>
      <h1 className="mb-6 mt-6 font-display text-3xl font-extrabold">프롬프트 수정</h1>
      <Suspense fallback={<EditorFormSkeleton />}>
        <PromptFormSection id={params.id} />
      </Suspense>
      <Suspense fallback={<PagerSkeleton className="mt-10" />}>
        <NeighborsPager id={params.id} placement="bottom" />
      </Suspense>
    </div>
  )
}

async function NeighborsPager({ id, placement }: { id: string; placement?: "bottom" }) {
  if (!isSupabaseConfigured()) return <PostPager listHref="/promptkit" placement={placement} />
  const supabase = createClient()
  const { data: rows } = await supabase.from("prompts").select("id, title").order("created_at", { ascending: false })
  const neighbors = findNeighbors(
    (rows as { id: string; title: string }[]) ?? [],
    id,
    (item) => item.id,
    (item) => `/promptkit/${item.id}`,
    (item) => item.title
  )
  return <PostPager listHref="/promptkit" placement={placement} {...neighbors} />
}

async function PromptFormSection({ id }: { id: string }) {
  if (!isSupabaseConfigured()) notFound()
  const supabase = createClient()
  const { data } = await supabase.from("prompts").select("*").eq("id", id).maybeSingle()
  const prompt = data as Prompt | null
  if (!prompt) notFound()
  return <PromptForm prompt={prompt} />
}

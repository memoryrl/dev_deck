import { Suspense } from "react"
import { notFound } from "next/navigation"
import { CareerForm } from "../career-form"
import { PostPager } from "@/components/board/post-pager"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { EditorFormSkeleton, PagerSkeleton } from "@/components/layout/skeletons"
import { findNeighbors } from "@/lib/posts/neighbors"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { CareerPost } from "@/types/career"

export default function CareerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="w-full">
      <Suspense fallback={<PagerSkeleton />}>
        <NeighborsPager id={params.id} />
      </Suspense>
      <PageTitleBanner title="글 수정" breadcrumb={[{ label: "글 수정" }]} className="mb-6 mt-6" />
      <Suspense fallback={<EditorFormSkeleton />}>
        <CareerFormSection id={params.id} />
      </Suspense>
      <Suspense fallback={<PagerSkeleton className="mt-10" />}>
        <NeighborsPager id={params.id} placement="bottom" />
      </Suspense>
    </div>
  )
}

async function NeighborsPager({ id, placement }: { id: string; placement?: "bottom" }) {
  if (!isSupabaseConfigured()) return <PostPager listHref="/career" placement={placement} />
  const supabase = createClient()
  const { data: rows } = await supabase.from("career_posts").select("id, title").order("created_at", { ascending: false })
  const neighbors = findNeighbors(
    (rows as { id: string; title: string }[]) ?? [],
    id,
    (item) => item.id,
    (item) => `/career/${item.id}`,
    (item) => item.title
  )
  return <PostPager listHref="/career" placement={placement} {...neighbors} />
}

async function CareerFormSection({ id }: { id: string }) {
  if (!isSupabaseConfigured()) notFound()
  const supabase = createClient()
  const { data } = await supabase.from("career_posts").select("*").eq("id", id).maybeSingle()
  const post = data as CareerPost | null
  if (!post) notFound()
  return <CareerForm post={post} />
}

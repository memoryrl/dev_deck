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
import { ShareButton } from "@/components/share/share-button"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "커리어 글 수정 · DevDeck", robots: { index: false, follow: false } }

export default async function CareerDetailPage(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params;
  return (
    <div className="w-full">
      <PageTitleBanner
        title="글 수정"
        breadcrumb={[{ label: "글 수정" }]}
        actions={<ShareButton targetType="career" targetId={params.id} />}
        className="mt-6"
      />
      <Suspense fallback={<PagerSkeleton className="mb-6 mt-6" />}>
        <NeighborsPager id={params.id} className="mb-6 mt-6" />
      </Suspense>
      <Suspense fallback={<EditorFormSkeleton />}>
        <CareerFormSection id={params.id} />
      </Suspense>
      <Suspense fallback={<PagerSkeleton className="mt-10" />}>
        <NeighborsPager id={params.id} placement="bottom" />
      </Suspense>
    </div>
  )
}

async function NeighborsPager({ id, placement, className }: { id: string; placement?: "bottom"; className?: string }) {
  if (!isSupabaseConfigured()) return <PostPager className={className} listHref="/career" placement={placement} />
  const supabase = await createClient()
  const { data: rows } = await supabase.from("career_posts").select("id, title").order("created_at", { ascending: false })
  const neighbors = findNeighbors(
    (rows as { id: string; title: string }[]) ?? [],
    id,
    (item) => item.id,
    (item) => `/career/${item.id}`,
    (item) => item.title
  )
  return <PostPager className={className} listHref="/career" placement={placement} {...neighbors} />
}

async function CareerFormSection({ id }: { id: string }) {
  if (!isSupabaseConfigured()) notFound()
  const supabase = await createClient()
  const { data } = await supabase.from("career_posts").select("*").eq("id", id).maybeSingle()
  const post = data as CareerPost | null
  if (!post) notFound()
  return <CareerForm post={post} />
}

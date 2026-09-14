import { notFound } from "next/navigation"
import { CareerForm } from "../career-form"
import { PostPager } from "@/components/board/post-pager"
import { findNeighbors } from "@/lib/posts/neighbors"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { CareerPost } from "@/types/career"

export default async function CareerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  if (!isSupabaseConfigured()) notFound()
  const supabase = createClient()
  const { data } = await supabase.from("career_posts").select("*").eq("id", params.id).maybeSingle()
  const post = data as CareerPost | null
  if (!post) notFound()
  const { data: rows } = await supabase
    .from("career_posts")
    .select("id, title")
    .order("created_at", { ascending: false })
  const neighbors = findNeighbors(
    (rows as { id: string; title: string }[]) ?? [],
    post.id,
    (item) => item.id,
    (item) => `/career/${item.id}`,
    (item) => item.title
  )

  return (
    <div className="mx-auto max-w-3xl">
      <PostPager listHref="/career" {...neighbors} />
      <h1 className="mb-6 mt-6 font-display text-3xl font-extrabold">글 수정</h1>
      <CareerForm post={post} />
      <PostPager className="mt-10" listHref="/career" {...neighbors} />
    </div>
  )
}

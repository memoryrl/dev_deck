import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { CareerPost } from "@/types/career"
import { CareerForm } from "../career-form"

export default async function CareerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  if (!isSupabaseConfigured()) notFound()
  const supabase = createClient()
  const { data } = await supabase
    .from("career_posts")
    .select("*")
    .eq("id", params.id)
    .maybeSingle()
  const post = data as CareerPost | null
  if (!post) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-3xl font-extrabold">글 수정</h1>
      <CareerForm post={post} />
    </div>
  )
}

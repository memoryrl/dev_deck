import Link from "next/link"
import { CareerForm } from "./career-form"
import { PostList } from "@/components/board/post-list"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient, ensureProfile } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import type { CareerPost } from "@/types/career"

export default async function CareerPage() {
  let posts: CareerPost[] = []
  if (isSupabaseConfigured()) {
    await ensureProfile()
    const supabase = createClient()
    const { data } = await supabase.from("career_posts").select("*").order("created_at", { ascending: false })
    posts = (data as CareerPost[]) ?? []
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold">CareerLog</h1>
        <Link href="/career/skills">
          <Button variant="outline">스킬 관리</Button>
        </Link>
      </div>
      <Card>
        <h2 className="mb-4 font-display text-xl font-bold">새 글</h2>
        <CareerForm />
      </Card>
      <PostList
        searchable
        empty="참여했던 프로젝트를 글로 남겨 보세요."
        items={posts.map((post) => ({
          href: `/career/${post.id}`,
          title: post.title,
          createdAt: post.created_at,
          author: post.company,
          meta: [post.post_type, post.is_public ? "공개" : "비공개"].filter(Boolean).join(" · "),
        }))}
      />
    </div>
  )
}

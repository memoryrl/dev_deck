import { Suspense } from "react"
import Link from "next/link"
import { CareerForm } from "./career-form"
import { PostList } from "@/components/board/post-list"
import { ListSkeleton } from "@/components/layout/skeletons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { listCareerPostsPage } from "@/lib/career/public"
import { parseListPage, parseSearchQuery } from "@/lib/pagination"
import { ensureProfile } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export default function CareerPage({
  searchParams,
}: {
  searchParams?: { page?: string; q?: string }
}) {
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)

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
      <Suspense fallback={<ListSkeleton />}>
        <CareerPostList page={page} q={q} />
      </Suspense>
    </div>
  )
}

async function CareerPostList({ page, q }: { page: number; q: string }) {
  if (isSupabaseConfigured()) await ensureProfile()
  const posts = await listCareerPostsPage({ page, q })
  return (
    <PostList
      searchable
      pathname="/career"
      searchQuery={q}
      paged={posts}
      empty="참여했던 프로젝트를 글로 남겨 보세요."
      items={posts.rows.map((post) => ({
        href: `/career/${post.id}`,
        title: post.title,
        createdAt: post.created_at,
        author: post.company,
        meta: [post.post_type, post.is_public ? "공개" : "비공개"].filter(Boolean).join(" · "),
      }))}
    />
  )
}

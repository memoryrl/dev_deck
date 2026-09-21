import { Suspense } from "react"
import Link from "next/link"
import { CareerForm } from "./career-form"
import { PostList } from "@/components/board/post-list"
import { WriteForm, WritePanel, WriteToggle } from "@/components/board/write-panel"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
import { Button } from "@/components/ui/button"
import { listCareerPostsPage } from "@/lib/career/public"
import { parseListPage, parseSearchQuery } from "@/lib/pagination"
import { ensureProfile } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"

export default async function CareerPage(
  props: {
    searchParams?: Promise<{ page?: string; q?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title="CareerLog"
        actions={
          <Link href="/career/skills">
            <Button variant="outline">스킬 관리</Button>
          </Link>
        }
      />
      <WritePanel label="새 글" closeLabel="접기">
        <div className="flex justify-end">
          <WriteToggle />
        </div>
        <WriteForm>
          <CareerForm />
        </WriteForm>
      </WritePanel>
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

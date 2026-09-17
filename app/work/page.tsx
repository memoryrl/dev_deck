import { Suspense } from "react"
import { PostList } from "@/components/board/post-list"
import { ListSkeleton } from "@/components/layout/skeletons"
import { PublicContainer } from "@/components/layout/public-container"
import { listCareerPostsPage } from "@/lib/career/public"
import { parseListPage, parseSearchQuery } from "@/lib/pagination"
import { getT } from "@/lib/i18n/dictionary"

export default function WorkBoardPage({
  searchParams,
}: {
  searchParams?: { page?: string; q?: string }
}) {
  const { t } = getT()
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)

  return (
    <PublicContainer>
      <h1 className="font-display text-4xl font-extrabold">{t("work.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("work.lede")}</p>
      <div className="mt-8">
        <Suspense fallback={<ListSkeleton />}>
          <WorkPostList page={page} q={q} empty={t("list.emptyPublic")} />
        </Suspense>
      </div>
    </PublicContainer>
  )
}

async function WorkPostList({ page, q, empty }: { page: number; q: string; empty: string }) {
  const posts = await listCareerPostsPage({ page, q, publicOnly: true })
  return (
    <PostList
      searchable
      pathname="/work"
      searchQuery={q}
      paged={posts}
      empty={empty}
      items={posts.rows.map((post) => ({
        href: `/work/${post.id}`,
        title: post.title,
        createdAt: post.created_at,
        author: post.company,
        meta: post.post_type,
      }))}
    />
  )
}

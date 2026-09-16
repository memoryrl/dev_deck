import { PostList } from "@/components/board/post-list"
import { PublicContainer } from "@/components/layout/public-container"
import { listCareerPostsPage } from "@/lib/career/public"
import { parseListPage, parseSearchQuery } from "@/lib/pagination"
import { getT } from "@/lib/i18n/dictionary"

export default async function WorkBoardPage({
  searchParams,
}: {
  searchParams?: { page?: string; q?: string }
}) {
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)
  const posts = await listCareerPostsPage({ page, q, publicOnly: true })
  const { t } = getT()

  return (
    <PublicContainer>
      <h1 className="font-display text-4xl font-extrabold">{t("work.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("work.lede")}</p>
      <PostList
        className="mt-8"
        searchable
        pathname="/work"
        searchQuery={q}
        paged={posts}
        empty={t("list.emptyPublic")}
        items={posts.rows.map((post) => ({
          href: `/work/${post.id}`,
          title: post.title,
          createdAt: post.created_at,
          author: post.company,
          meta: post.post_type,
        }))}
      />
    </PublicContainer>
  )
}

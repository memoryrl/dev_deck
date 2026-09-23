import { Suspense, type ReactNode } from "react"
import { CareerForm } from "@/app/(dashboard)/career/career-form"
import { PostList } from "@/components/board/post-list"
import { WriteForm, WritePanel, WriteToggle } from "@/components/board/write-panel"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
import { PublicContainer } from "@/components/layout/public-container"
import { canWriteSystemBoard } from "@/lib/boards/access"
import { listCareerPostsPage } from "@/lib/career/public"
import { parseListPage, parseSearchQuery } from "@/lib/pagination"
import { getT } from "@/lib/i18n/dictionary"

export default async function WorkBoardPage(
  props: {
    searchParams?: Promise<{ page?: string; q?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const { t } = await getT()
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)
  const canWrite = await canWriteSystemBoard("career")

  return (
    <PublicContainer>
      <PageTitleBanner title={t("work.title")} description={t("work.lede")} />
      <div className="mt-8">
        {canWrite ? (
          <WritePanel label={t("list.write")} closeLabel={t("list.closeWrite")}>
            <Suspense fallback={<ListSkeleton />}>
              <WorkPostList
                page={page}
                q={q}
                empty={t("list.emptyPublic")}
                includePrivate
                endAction={<WriteToggle />}
                composer={
                  <WriteForm>
                    <CareerForm returnTo="/work" />
                  </WriteForm>
                }
              />
            </Suspense>
          </WritePanel>
        ) : (
          <Suspense fallback={<ListSkeleton />}>
            <WorkPostList page={page} q={q} empty={t("list.emptyPublic")} />
          </Suspense>
        )}
      </div>
    </PublicContainer>
  )
}

async function WorkPostList({
  page,
  q,
  empty,
  includePrivate = false,
  endAction,
  composer,
}: {
  page: number
  q: string
  empty: string
  includePrivate?: boolean
  endAction?: ReactNode
  composer?: ReactNode
}) {
  const posts = await listCareerPostsPage({ page, q, publicOnly: !includePrivate })
  return (
    <PostList
      searchable
      layout="feed"
      pathname="/work"
      searchQuery={q}
      paged={posts}
      empty={empty}
      endAction={endAction}
      composer={composer}
      items={posts.rows.map((post) => ({
        href: `/work/${post.id}`,
        title: post.title,
        createdAt: post.created_at,
        author: post.company,
        meta: [post.post_type, post.is_public ? null : "비공개"].filter(Boolean).join(" · ") || null,
        excerpt: post.excerpt,
      }))}
    />
  )
}

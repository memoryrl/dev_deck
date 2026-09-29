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
import { formatPeriod } from "@/lib/i18n/format"

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
  const { t } = await getT()
  // created_at(등록순)이 아니라 근무·활동 기간 기준 — 회사 연혁처럼 최신이 위, 과거가 아래로 온다.
  const posts = await listCareerPostsPage({ page, q, publicOnly: !includePrivate, sort: "period" })
  return (
    <PostList
      searchable
      layout="timeline"
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
        periodLabel: formatPeriod(post.period_start, post.period_end, t("date.present")),
        periodYear: (post.period_start ?? post.created_at).slice(0, 4),
      }))}
    />
  )
}

import { Suspense, type ReactNode } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AccessDeniedPage } from "@/components/errors/access-denied-page"
import { PostList, type PostListRow } from "@/components/board/post-list"
import { PublicPostForm } from "@/components/board/public-post-form"
import { WriteForm, WritePanel, WriteToggle } from "@/components/board/write-panel"
import { ListSkeleton } from "@/components/layout/skeletons"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { PublicContainer } from "@/components/layout/public-container"
import { boardPath, roleAtLeast } from "@/lib/access"
import { currentAccessRole } from "@/lib/boards/access"
import { getBoardBySlug, listBoardPostsPage } from "@/lib/boards/public"
import { isSystemBoard, systemPublicHref } from "@/lib/boards/system"
import { listCareerPostsPage } from "@/lib/career/public"
import { parseListPage, parseSearchQuery, type PagedResult } from "@/lib/pagination"
import { listPromptsPage, withPromptThumbnails } from "@/lib/prompts/public"
import { listGameReviewsPage } from "@/lib/steam/reviews"
import { getT } from "@/lib/i18n/dictionary"
import type { Board } from "@/types/board"

export default async function PublicBoardPage(
  props: {
    params: Promise<{ slug: string }>
    searchParams?: Promise<{ page?: string; q?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  // board와 role은 서로 결과를 안 쓴다 — 동시에 보내고, 게이트 판정만 둘 다 모인 뒤에 한다.
  const [board, role] = await Promise.all([getBoardBySlug(params.slug), currentAccessRole()])
  if (!board || !board.is_active) notFound()
  if (!roleAtLeast(role, board.view_role)) return <AccessDeniedPage role={role} />

  const { t } = await getT()
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)
  const system = isSystemBoard(board)
  const canWrite = !system && roleAtLeast(role, board.write_role)

  return (
    <PublicContainer>
      <PageTitleBanner title={board.name} description={board.description} />

      <div className="mt-8 space-y-4">
        {canWrite ? (
          <WritePanel label={t("list.write")} closeLabel={t("list.closeWrite")}>
            <Suspense fallback={<ListSkeleton />}>
              <BoardPostList
                board={board}
                page={page}
                q={q}
                endAction={<WriteToggle />}
                composer={
                  <WriteForm>
                    <PublicPostForm boardId={board.id} slug={board.slug} />
                  </WriteForm>
                }
              />
            </Suspense>
          </WritePanel>
        ) : (
          <>
            {!system && board.write_role === "member" && role === "visitor" ? (
              <p className="text-sm text-muted-foreground">
                글을 쓰려면{" "}
                <Link href="/login" className="font-semibold text-foreground underline">
                  {t("common.login")}
                </Link>
                하세요.
              </p>
            ) : null}
            <Suspense fallback={<ListSkeleton />}>
              <BoardPostList board={board} page={page} q={q} />
            </Suspense>
          </>
        )}
      </div>
    </PublicContainer>
  )
}

async function BoardPostList({
  board,
  page,
  q,
  endAction,
  composer,
}: {
  board: Board
  page: number
  q: string
  endAction?: ReactNode
  composer?: ReactNode
}) {
  const system = isSystemBoard(board)
  const pathname = boardPath(board.slug)
  const paged = system
    ? await listSystemPublicPage(board.kind, page, q)
    : await listGenericBoardPage(board.id, board.slug, page, q)

  return (
    <PostList
      searchable
      pathname={pathname}
      searchQuery={q}
      paged={paged}
      empty="아직 글이 없습니다."
      items={paged.rows}
      layout={board.kind === "prompts" ? "cards" : board.slug === "skills" ? "feed" : "list"}
      endAction={endAction}
      composer={composer}
    />
  )
}

async function listGenericBoardPage(boardId: string, slug: string, page: number, q: string) {
  const posts = await listBoardPostsPage(boardId, page, q)
  return {
    ...posts,
    rows: posts.rows.map((post) => ({
      href: `${boardPath(slug)}/${post.id}`,
      title: post.title,
      createdAt: post.created_at,
      meta: post.is_published ? null : "비공개",
      excerpt: post.excerpt,
    })),
  } satisfies PagedResult<PostListRow>
}

async function listSystemPublicPage(kind: "prompts" | "career" | "steam", page: number, q: string) {
  if (kind === "prompts") {
    const prompts = await listPromptsPage({ page, q, publicOnly: true })
    const rows = await withPromptThumbnails(prompts.rows)
    return {
      ...prompts,
      rows: rows.map((prompt) => ({
        href: systemPublicHref(kind, prompt.id),
        title: prompt.title,
        createdAt: prompt.created_at,
        meta: prompt.category,
        thumbnailUrl: prompt.thumbnailUrl,
      })),
    } satisfies PagedResult<PostListRow>
  }
  if (kind === "career") {
    const posts = await listCareerPostsPage({ page, q, publicOnly: true })
    return {
      ...posts,
      rows: posts.rows.map((post) => ({
        href: systemPublicHref(kind, post.id),
        title: post.title,
        createdAt: post.created_at,
        author: post.company,
        meta: post.post_type,
      })),
    } satisfies PagedResult<PostListRow>
  }
  const reviews = await listGameReviewsPage({ page, q })
  return {
    ...reviews,
    rows: reviews.rows.map((review) => ({
      href: systemPublicHref(kind, review.id, review.app_id),
      title: review.game_title,
      createdAt: review.created_at,
      meta: `평점 ${review.rating}`,
    })),
  } satisfies PagedResult<PostListRow>
}

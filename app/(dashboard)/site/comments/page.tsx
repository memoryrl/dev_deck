import { Suspense } from "react"
import Link from "next/link"
import { CommentAdminActions, ProfanityDeleteButton } from "@/app/(dashboard)/site/comments/admin-actions"
import { ProfanityWordsPanel } from "@/app/(dashboard)/site/comments/profanity-words-panel"
import { ProfanityWordForm } from "@/app/(dashboard)/site/comments/word-form"
import { ListPager } from "@/components/layout/list-pager"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
import { RichContent } from "@/components/editor/rich-content"
import { commentTargetHref, commentTargetLabel, listAllComments, listProfanityWords } from "@/lib/comments/public"
import { requireOwner } from "@/lib/auth/owner"
import { parseListPage } from "@/lib/pagination"
import { createClient } from "@/lib/supabase/server"
import { ensureProfile } from "@/lib/supabase/server"
import { formatBoardDateTime, isSupabaseConfigured } from "@/lib/utils"

export default async function SiteCommentsPage(
  props: {
    searchParams?: Promise<{ page?: string; words?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const commentPage = parseListPage(searchParams?.page)
  const wordPage = parseListPage(searchParams?.words)

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title="댓글 관리"
        description="모든 게시글·게임 상세 댓글을 조회하고 숨기거나 삭제합니다. 욕설 단어는 저장 시 자동 치환됩니다."
      />

      <Suspense fallback={<ListSkeleton withSearch={false} />}>
        <ProfanityWordsSection wordPage={wordPage} commentPage={commentPage} />
      </Suspense>
      <Suspense fallback={<ListSkeleton withSearch={false} />}>
        <CommentsSection commentPage={commentPage} wordPage={wordPage} />
      </Suspense>
    </div>
  )
}

async function ProfanityWordsSection({ wordPage, commentPage }: { wordPage: number; commentPage: number }) {
  await ensureProfile()
  const words = await listProfanityWords(wordPage)
  return (
    <ProfanityWordsPanel total={words.total}>
      <ProfanityWordForm />
      {words.total === 0 ? (
        <p className="text-sm text-muted-foreground">등록된 단어가 없습니다.</p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {words.rows.map((word) => (
              <li key={word.id} className="flex items-center justify-between gap-3 py-2">
                <p className="text-sm">
                  <span className="font-semibold">{word.word}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span>{word.replacement}</span>
                </p>
                <ProfanityDeleteButton id={word.id} />
              </li>
            ))}
          </ul>
          <ListPager
            pathname="/site/comments"
            param="words"
            result={words}
            extraParams={{ page: commentPage }}
          />
        </>
      )}
    </ProfanityWordsPanel>
  )
}

async function CommentsSection({ commentPage, wordPage }: { commentPage: number; wordPage: number }) {
  // 전체 IP·회원 여부까지 서비스 롤로 읽으므로 관리자 확인이 반드시 먼저다.
  await requireOwner()
  const comments = await listAllComments(commentPage)
  const boardSlugs = await boardSlugMap(
    comments.rows.filter((item) => item.target_type === "board").map((item) => item.target_id)
  )

  return (
    <div>
      <h2 className="font-display text-xl font-bold">댓글 {comments.total}건</h2>
      {comments.total === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">아직 댓글이 없습니다.</p>
      ) : (
        <>
          <ul className="mt-2 divide-y border-y bg-white dark:bg-card">
            {comments.rows.map((comment, index) => {
              const href = commentTargetHref(
                comment.target_type,
                comment.target_id,
                boardSlugs.get(comment.target_id)
              )
              const author = comment.author_name.trim() || "이름 없음"
              const number = (comments.page - 1) * comments.pageSize + index + 1
              return (
                <li
                  key={comment.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-snug">
                      <span className="text-muted-foreground">No. {number}</span>
                      <span className="mx-2 text-foreground/20">|</span>
                      <span className="font-semibold text-foreground">{commentTargetLabel(comment.target_type)}</span>
                      <span className="mx-2 text-foreground/20">|</span>
                      <Link href={href} className="font-medium underline-offset-2 hover:underline">
                        원문
                      </Link>
                      <span className="mx-2 text-foreground/20">|</span>
                      <span>{comment.parent_id ? "답글" : "댓글"}</span>
                      {comment.is_hidden ? (
                        <>
                          <span className="mx-2 text-foreground/20">|</span>
                          <span className="text-destructive">숨김</span>
                        </>
                      ) : null}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      작성자 <span className="font-semibold text-foreground">{author}</span>
                      <span className="mx-1.5 text-foreground/20">|</span>
                      {comment.user_id ? "회원" : "비회원"}
                      <span className="mx-1.5 text-foreground/20">|</span>
                      IP {comment.ip_address || "-"}
                      {comment.ip_region ? (
                        <>
                          <span className="mx-1.5 text-foreground/20">|</span>
                          {comment.ip_region}
                        </>
                      ) : null}
                      <span className="mx-1.5 text-foreground/20">|</span>
                      등록일 {formatBoardDateTime(comment.created_at)}
                    </p>
                    <RichContent content={comment.body} className="mt-2 space-y-2 text-sm" />
                  </div>
                  <CommentAdminActions id={comment.id} hidden={comment.is_hidden} />
                </li>
              )
            })}
          </ul>
          <ListPager
            pathname="/site/comments"
            param="page"
            result={comments}
            extraParams={{ words: wordPage }}
          />
        </>
      )}
    </div>
  )
}

async function boardSlugMap(postIds: string[]) {
  const map = new Map<string, string>()
  if (!isSupabaseConfigured() || postIds.length === 0) return map
  const supabase = await createClient()
  const { data } = await supabase.from("board_posts").select("id, boards(slug)").in("id", postIds)
  for (const row of (data as { id: string; boards: { slug: string } | { slug: string }[] | null }[]) ?? []) {
    const board = Array.isArray(row.boards) ? row.boards[0] : row.boards
    if (board?.slug) map.set(row.id, board.slug)
  }
  return map
}

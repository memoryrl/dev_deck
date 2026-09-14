import Link from "next/link"
import { CommentAdminActions, ProfanityDeleteButton } from "@/app/(dashboard)/site/comments/admin-actions"
import { ProfanityWordForm } from "@/app/(dashboard)/site/comments/word-form"
import { Card } from "@/components/ui/card"
import { RichContent } from "@/components/editor/rich-content"
import { commentTargetHref, commentTargetLabel, listAllComments, listProfanityWords } from "@/lib/comments/public"
import { createClient } from "@/lib/supabase/server"
import { ensureProfile } from "@/lib/supabase/server"
import { formatBoardDateTime, isSupabaseConfigured } from "@/lib/utils"

export default async function SiteCommentsPage() {
  await ensureProfile()
  const comments = await listAllComments()
  const words = await listProfanityWords()
  const boardSlugs = await boardSlugMap(comments.filter((item) => item.target_type === "board").map((item) => item.target_id))

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold">댓글 관리</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          모든 게시글·게임 상세 댓글을 조회하고 숨기거나 삭제합니다. 욕설 단어는 저장 시 자동 치환됩니다.
        </p>
      </div>

      <Card className="space-y-4">
        <h2 className="font-display text-xl font-bold">욕설 치환 단어</h2>
        <ProfanityWordForm />
        {words.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 단어가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border">
            {words.map((word) => (
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
        )}
      </Card>

      <div className="space-y-3">
        <h2 className="font-display text-xl font-bold">댓글 {comments.length}건</h2>
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 댓글이 없습니다.</p>
        ) : (
          comments.map((comment) => {
            const href = commentTargetHref(comment.target_type, comment.target_id, boardSlugs.get(comment.target_id))
            return (
              <Card key={comment.id} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{commentTargetLabel(comment.target_type)}</span>
                  <Link href={href} className="underline">
                    원문
                  </Link>
                  {comment.parent_id ? <span>답글</span> : <span>댓글</span>}
                  {comment.is_hidden ? <span>숨김</span> : null}
                  <span>{formatBoardDateTime(comment.created_at)}</span>
                </div>
                <p className="text-sm font-semibold">
                  {comment.author_name}{" "}
                  <span className="font-normal text-muted-foreground">
                    {comment.ip_address} · {comment.ip_region ?? "-"}
                  </span>
                </p>
                <RichContent content={comment.body} className="space-y-2 text-sm" />
                <CommentAdminActions id={comment.id} hidden={comment.is_hidden} />
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

async function boardSlugMap(postIds: string[]) {
  const map = new Map<string, string>()
  if (!isSupabaseConfigured() || postIds.length === 0) return map
  const supabase = createClient()
  const { data } = await supabase.from("board_posts").select("id, boards(slug)").in("id", postIds)
  for (const row of (data as { id: string; boards: { slug: string } | { slug: string }[] | null }[]) ?? []) {
    const board = Array.isArray(row.boards) ? row.boards[0] : row.boards
    if (board?.slug) map.set(row.id, board.slug)
  }
  return map
}

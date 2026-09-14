import { CommentSection } from "@/components/comments/comment-section"
import { currentViewer } from "@/lib/boards/access"
import { listComments } from "@/lib/comments/public"
import { sessionUserView } from "@/lib/auth/session-user"
import type { CommentTargetType } from "@/types/comment"

export async function ArticleComments({
  targetType,
  targetId,
  returnTo,
}: {
  targetType: CommentTargetType
  targetId: string
  returnTo: string
}) {
  const comments = await listComments(targetType, targetId)
  const { user } = await currentViewer()
  const viewerName = user ? sessionUserView(user).name : ""

  return (
    <CommentSection
      targetType={targetType}
      targetId={targetId}
      returnTo={returnTo}
      comments={comments}
      signedIn={Boolean(user)}
      viewerName={viewerName}
    />
  )
}

import { CommentSection } from "@/components/comments/comment-section"
import { roleAtLeast, type AccessRole } from "@/lib/access"
import { currentViewer } from "@/lib/boards/access"
import { listComments } from "@/lib/comments/public"
import { sessionUserView } from "@/lib/auth/session-user"
import type { CommentTargetType } from "@/types/comment"

export async function ArticleComments({
  targetType,
  targetId,
  returnTo,
  commentRole = "visitor",
}: {
  targetType: CommentTargetType
  targetId: string
  returnTo: string
  commentRole?: AccessRole
}) {
  const comments = await listComments(targetType, targetId)
  const { user, role } = await currentViewer()
  const viewerName = user ? sessionUserView(user).name : ""

  return (
    <CommentSection
      targetType={targetType}
      targetId={targetId}
      returnTo={returnTo}
      comments={comments}
      signedIn={Boolean(user)}
      viewerName={viewerName}
      canComment={roleAtLeast(role, commentRole)}
      commentRole={commentRole}
    />
  )
}

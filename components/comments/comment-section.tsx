"use client"

import { useState } from "react"
import { CommentForm } from "@/components/comments/comment-form"
import { RichContent } from "@/components/editor/rich-content"
import { maskIp } from "@/lib/comments/mask"
import { countComments } from "@/lib/comments/tree"
import { formatBoardDateTime } from "@/lib/utils"
import type { CommentNode, CommentTargetType } from "@/types/comment"
import { cn } from "@/lib/utils"

export function CommentSection({
  targetType,
  targetId,
  returnTo,
  comments,
  signedIn,
  viewerName,
}: {
  targetType: CommentTargetType
  targetId: string
  returnTo: string
  comments: CommentNode[]
  signedIn: boolean
  viewerName: string
}) {
  const total = countComments(comments)

  return (
    <section className="mt-12 border-t border-foreground/10 pt-8">
      <h2 className="font-display text-2xl font-bold">댓글 {total}</h2>
      <p className="mt-1 text-sm text-muted-foreground">비회원도 작성할 수 있습니다. 저장 시 이름 옆에 IP와 지역이 표시됩니다.</p>
      <div className="mt-5 rounded-2xl border border-foreground/10 bg-background/60 p-4">
        <CommentForm
          targetType={targetType}
          targetId={targetId}
          returnTo={returnTo}
          signedIn={signedIn}
          defaultName={viewerName}
        />
      </div>
      {comments.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">아직 댓글이 없습니다.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {comments.map((node) => (
            <CommentItem
              key={node.id}
              node={node}
              depth={0}
              targetType={targetType}
              targetId={targetId}
              returnTo={returnTo}
              signedIn={signedIn}
              viewerName={viewerName}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function CommentItem({
  node,
  depth,
  targetType,
  targetId,
  returnTo,
  signedIn,
  viewerName,
}: {
  node: CommentNode
  depth: number
  targetType: CommentTargetType
  targetId: string
  returnTo: string
  signedIn: boolean
  viewerName: string
}) {
  const [reply, setReply] = useState(false)
  const indent = Math.min(depth, 8)

  return (
    <li className={cn(indent > 0 && "border-l border-foreground/10 pl-4")} style={{ marginLeft: indent ? undefined : undefined }}>
      <article className="rounded-xl bg-foreground/[0.03] px-4 py-3" style={{ marginLeft: indent > 0 ? `${Math.min(indent, 6) * 0.5}rem` : undefined }}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-sm font-semibold">{node.author_name}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{maskIp(node.ip_address)}</span>
          {node.ip_region ? <span className="text-xs text-muted-foreground">{node.ip_region}</span> : null}
          <span className="text-xs text-muted-foreground">{formatBoardDateTime(node.created_at)}</span>
        </div>
        {node.is_hidden ? (
          <p className="mt-2 text-sm text-muted-foreground">숨긴 댓글입니다.</p>
        ) : (
          <div className="mt-2">
            <RichContent content={node.body} className="space-y-2 text-sm" />
          </div>
        )}
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          onClick={() => setReply((value) => !value)}
        >
          {reply ? "취소" : "답글"}
        </button>
        {reply ? (
          <div className="mt-3">
            <CommentForm
              targetType={targetType}
              targetId={targetId}
              parentId={node.id}
              returnTo={returnTo}
              signedIn={signedIn}
              defaultName={viewerName}
              compact
              onDone={() => setReply(false)}
            />
          </div>
        ) : null}
      </article>
      {node.children.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {node.children.map((child) => (
            <CommentItem
              key={child.id}
              node={child}
              depth={depth + 1}
              targetType={targetType}
              targetId={targetId}
              returnTo={returnTo}
              signedIn={signedIn}
              viewerName={viewerName}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

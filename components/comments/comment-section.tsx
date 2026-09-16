"use client"

import { useState } from "react"
import { CommentForm } from "@/components/comments/comment-form"
import { RichContent } from "@/components/editor/rich-content"
import { useI18n } from "@/components/i18n/i18n-provider"
import { formatBoardDateTime } from "@/lib/i18n/format"
import { maskIp } from "@/lib/comments/mask"
import { countComments } from "@/lib/comments/tree"
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
  const { t } = useI18n()

  return (
    <section className="mt-12 border-t border-foreground/10 pt-8">
      <h2 className="font-display text-2xl font-bold">{t("comments.title", { count: total })}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("comments.hint")}</p>
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
        <p className="mt-6 text-sm text-muted-foreground">{t("comments.empty")}</p>
      ) : (
        <ul className="mt-6 divide-y border-y bg-white dark:bg-card">
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
  const { t, locale } = useI18n()

  return (
    <li
      className={cn(indent > 0 && "border-l border-foreground/10 pl-4")}
      style={{ marginLeft: indent > 0 ? `${Math.min(indent, 6) * 0.5}rem` : undefined }}
    >
      <article className={cn("py-3", depth === 0 ? "px-4 sm:px-5" : "pr-2")}>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>
            {t("comments.author")} <span className="text-sm font-semibold text-foreground">{node.author_name}</span>
          </span>
          <span className="tabular-nums">{maskIp(node.ip_address)}</span>
          {node.ip_region ? <span>{node.ip_region}</span> : null}
          <span>{formatBoardDateTime(node.created_at, locale)}</span>
          <button
            type="button"
            className="ml-auto text-xs font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => setReply((value) => !value)}
          >
            {reply ? t("common.cancel") : t("common.reply")}
          </button>
        </div>
        {node.is_hidden ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("comments.hidden")}</p>
        ) : (
          <div className="mt-2">
            <RichContent content={node.body} className="space-y-2 text-sm" />
          </div>
        )}
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

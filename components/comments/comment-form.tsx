"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createComment } from "@/app/comments/actions"
import { CommentEditor } from "@/components/editor/rich-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/i18n/i18n-provider"
import type { CommentTargetType } from "@/types/comment"

export function CommentForm({
  targetType,
  targetId,
  parentId,
  returnTo,
  signedIn,
  defaultName,
  onDone,
  compact = false,
}: {
  targetType: CommentTargetType
  targetId: string
  parentId?: string | null
  returnTo: string
  signedIn: boolean
  defaultName: string
  onDone?: () => void
  compact?: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const { t } = useI18n()

  async function onSubmit(formData: FormData) {
    setPending(true)
    setError(null)
    formData.set("target_type", targetType)
    formData.set("target_id", targetId)
    formData.set("return_to", returnTo)
    if (parentId) formData.set("parent_id", parentId)
    const result = await createComment(formData)
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setEditorKey((value) => value + 1)
    onDone?.()
    router.refresh()
  }

  return (
    <form action={onSubmit} className={compact ? "space-y-2" : "space-y-3"}>
      {signedIn ? (
        <input type="hidden" name="author_name" value={defaultName} />
      ) : (
        <Input name="author_name" placeholder={t("comments.name")} maxLength={40} required defaultValue={defaultName} aria-label={t("comments.name")} />
      )}
      <CommentEditor
        key={editorKey}
        name="body"
        compact
        placeholder={parentId ? t("comments.replyPlaceholder") : t("comments.placeholder")}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t("comments.saving") : parentId ? t("comments.replySave") : t("comments.save")}
      </Button>
    </form>
  )
}

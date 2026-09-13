"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createPrompt, deletePrompt, updatePrompt } from "./actions"
import { RichEditor } from "@/components/editor/rich-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { Prompt } from "@/types/prompt"

export function PromptForm({ prompt }: { prompt?: Prompt }) {
  const router = useRouter()
  const [isPublic, setIsPublic] = useState(prompt?.is_public ?? false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(formData: FormData) {
    if (isPublic) formData.set("is_public", "on")
    else formData.delete("is_public")
    const result = prompt
      ? await updatePrompt(prompt.id, formData)
      : await createPrompt(formData)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.push("/promptkit")
    router.refresh()
  }

  async function onDelete() {
    if (!prompt || !confirm("이 프롬프트를 삭제할까요?")) return
    await deletePrompt(prompt.id)
    router.push("/promptkit")
    router.refresh()
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">제목</Label>
        <Input id="title" name="title" required defaultValue={prompt?.title} />
      </div>
      <div>
        <Label htmlFor="category">카테고리</Label>
        <Input id="category" name="category" placeholder="General" defaultValue={prompt?.category} />
      </div>
      <div>
        <Label htmlFor="tags">태그 (콤마)</Label>
        <Input id="tags" name="tags" defaultValue={(prompt?.tags ?? []).join(", ")} />
      </div>
      <div>
        <Label>본문</Label>
        <div className="mt-2">
          <RichEditor name="content" defaultValue={prompt?.content ?? ""} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        <Label>공개</Label>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-3">
        <Button type="submit">{prompt ? "저장" : "만들기"}</Button>
        {prompt ? (
          <Button type="button" variant="destructive" onClick={onDelete}>
            삭제
          </Button>
        ) : null}
      </div>
    </form>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { createCareerPost, deleteCareerPost, updateCareerPost } from "./actions"
import { RichEditor } from "@/components/editor/rich-editor"
import { Button } from "@/components/ui/button"
import { showConfirm } from "@/lib/ui/layer-dialog"
import { CustomSelect } from "@/components/ui/custom-select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { CareerPost } from "@/types/career"

export function CareerForm({ post, returnTo, deleteTo }: { post?: CareerPost; returnTo?: string; deleteTo?: string }) {
  const router = useRouter()
  const [isPublic, setIsPublic] = useState(post?.is_public ?? false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(formData: FormData) {
    if (isPublic) formData.set("is_public", "on")
    else formData.delete("is_public")
    const result = post
      ? await updateCareerPost(post.id, formData)
      : await createCareerPost(formData)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.push(returnTo ?? "/career")
    router.refresh()
  }

  async function onDelete() {
    if (!post) return
    const ok = await showConfirm("이 글을 삭제할까요?", { destructive: true })
    if (!ok) return
    await deleteCareerPost(post.id)
    router.push(deleteTo ?? "/career")
    router.refresh()
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">제목</Label>
        <Input id="title" name="title" required defaultValue={post?.title} />
      </div>
      <div>
        <Label htmlFor="post_type">종류</Label>
        <CustomSelect
          id="post_type"
          name="post_type"
          defaultValue={post?.post_type ?? "project"}
          options={[
            { value: "project", label: "project" },
            { value: "skill", label: "skill" },
            { value: "note", label: "note" },
          ]}
        />
      </div>
      <div>
        <Label htmlFor="excerpt">요약</Label>
        <Input id="excerpt" name="excerpt" defaultValue={post?.excerpt ?? ""} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="company">회사</Label>
          <Input id="company" name="company" defaultValue={post?.company ?? ""} />
        </div>
        <div>
          <Label htmlFor="role">역할</Label>
          <Input id="role" name="role" defaultValue={post?.role ?? ""} />
        </div>
        <div>
          <Label htmlFor="period_start">시작일</Label>
          <Input id="period_start" name="period_start" type="date" defaultValue={post?.period_start ?? ""} />
        </div>
        <div>
          <Label htmlFor="period_end">종료일</Label>
          <Input id="period_end" name="period_end" type="date" defaultValue={post?.period_end ?? ""} />
        </div>
      </div>
      <div>
        <Label htmlFor="skills">관련 스킬 (콤마)</Label>
        <Input id="skills" name="skills" defaultValue={(post?.skills ?? []).join(", ")} />
      </div>
      <div>
        <Label htmlFor="tags">태그 (콤마)</Label>
        <Input id="tags" name="tags" defaultValue={(post?.tags ?? []).join(", ")} />
      </div>
      <div>
        <Label>본문</Label>
        <div className="mt-2">
          <RichEditor name="content" defaultValue={post?.content ?? ""} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        <Label>공개</Label>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-3">
        <Button type="submit">{post ? "저장" : "만들기"}</Button>
        {post ? (
          <Button type="button" variant="destructive" onClick={onDelete}>
            삭제
          </Button>
        ) : null}
      </div>
    </form>
  )
}

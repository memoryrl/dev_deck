"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { deleteBoard, upsertBoard } from "@/app/(dashboard)/site/actions"
import { ACCESS_ROLES, roleLabel } from "@/lib/access"
import { isSystemBoard, kindLabel } from "@/lib/boards/kind"
import { Button } from "@/components/ui/button"
import { CustomSelect } from "@/components/ui/custom-select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { Board } from "@/types/board"

export function BoardForm({ board }: { board?: Board }) {
  const router = useRouter()
  const [active, setActive] = useState(board?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)
  const system = board ? isSystemBoard(board) : false

  async function onSubmit(formData: FormData) {
    if (board) formData.set("id", board.id)
    if (active) formData.set("is_active", "on")
    else formData.delete("is_active")
    const result = await upsertBoard(formData)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.push("/site/boards")
    router.refresh()
  }

  async function onDelete() {
    if (!board || !confirm("게시판과 글을 모두 삭제할까요?")) return
    await deleteBoard(board.id)
    router.push("/site/boards")
    router.refresh()
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">이름</Label>
          <Input id="name" name="name" required defaultValue={board?.name} />
        </div>
        <div>
          <Label htmlFor="slug">슬러그</Label>
          <Input
            id="slug"
            name="slug"
            required
            defaultValue={board?.slug}
            placeholder="notice"
            readOnly={system}
          />
          {system && board ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {kindLabel(board.kind)} 시스템 게시판 슬러그는 바꿀 수 없습니다.
            </p>
          ) : null}
        </div>
      </div>
      <div>
        <Label htmlFor="description">설명</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={board?.description ?? ""} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="view_role">읽기 권한</Label>
          <CustomSelect
            id="view_role"
            name="view_role"
            defaultValue={board?.view_role ?? "visitor"}
            options={ACCESS_ROLES.map((role) => ({ value: role, label: roleLabel(role) }))}
          />
        </div>
        <div>
          <Label htmlFor="write_role">쓰기 권한</Label>
          <CustomSelect
            id="write_role"
            name="write_role"
            defaultValue={board?.write_role ?? "owner"}
            disabled={system}
            options={[
              { value: "owner", label: roleLabel("owner") },
              ...(!system ? [{ value: "member", label: roleLabel("member") }] : []),
            ]}
          />
        </div>
        <div>
          <Label htmlFor="comment_role">댓글 권한</Label>
          <CustomSelect
            id="comment_role"
            name="comment_role"
            defaultValue={board?.comment_role ?? "visitor"}
            options={ACCESS_ROLES.map((role) => ({ value: role, label: roleLabel(role) }))}
          />
        </div>
        <div>
          <Label htmlFor="sort_order">정렬</Label>
          <Input id="sort_order" name="sort_order" type="number" defaultValue={board?.sort_order ?? 0} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={active} onCheckedChange={setActive} />
        <Label>활성</Label>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit">{board ? "저장" : "게시판 추가"}</Button>
        {board && !system ? (
          <Button type="button" variant="destructive" onClick={onDelete}>
            삭제
          </Button>
        ) : null}
      </div>
    </form>
  )
}

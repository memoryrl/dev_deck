"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { deleteMenu, upsertMenu } from "@/app/(dashboard)/site/actions"
import { ACCESS_ROLES, roleLabel } from "@/lib/access"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { Board } from "@/types/board"
import type { MenuItem, MenuLocation } from "@/types/menu"

export function MenuForm({
  menu,
  menus,
  boards,
  defaultParentId,
  defaultLocation,
  onSaved,
  onDeleted,
}: {
  menu?: MenuItem
  menus: MenuItem[]
  boards: Board[]
  defaultParentId?: string | null
  defaultLocation?: MenuLocation
  onSaved?: (id: string) => void
  onDeleted?: () => void
}) {
  const router = useRouter()
  const [active, setActive] = useState(menu?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)
  const formId = menu?.id ?? "new"
  const parents = menus.filter((item) => !item.parent_id && item.id !== menu?.id)

  async function onSubmit(formData: FormData) {
    if (menu) formData.set("id", menu.id)
    if (active) formData.set("is_active", "on")
    else formData.delete("is_active")
    const result = await upsertMenu(formData)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
    if (result.id) onSaved?.(result.id)
    else if (menu) onSaved?.(menu.id)
  }

  async function onDelete() {
    if (!menu || !confirm("이 메뉴를 삭제할까요? 하위 메뉴도 함께 삭제됩니다.")) return
    await deleteMenu(menu.id)
    router.refresh()
    onDeleted?.()
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`label-${formId}`}>이름</Label>
          <Input id={`label-${formId}`} name="label" required defaultValue={menu?.label} />
        </div>
        <div>
          <Label htmlFor={`href-${formId}`}>직접 링크</Label>
          <Input
            id={`href-${formId}`}
            name="href"
            defaultValue={menu?.href ?? ""}
            placeholder="/work 또는 비움(하위 메뉴용)"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`board-${formId}`}>연결 게시판</Label>
          <select
            id={`board-${formId}`}
            name="board_id"
            defaultValue={menu?.board_id ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">없음 (직접 링크)</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name} (/{board.slug})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`parent-${formId}`}>상위 메뉴</Label>
          <select
            id={`parent-${formId}`}
            name="parent_id"
            defaultValue={menu?.parent_id ?? defaultParentId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">최상위</option>
            {parents.map((item) => (
              <option key={item.id} value={item.id}>
                [{item.location === "header" ? "헤더" : "푸터"}] {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor={`location-${formId}`}>위치</Label>
          <select
            id={`location-${formId}`}
            name="location"
            defaultValue={menu?.location ?? defaultLocation ?? "header"}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="header">헤더</option>
            <option value="footer">푸터</option>
          </select>
        </div>
        <div>
          <Label htmlFor={`view-${formId}`}>보이는 권한</Label>
          <select
            id={`view-${formId}`}
            name="view_role"
            defaultValue={menu?.view_role ?? "visitor"}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {ACCESS_ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)} 이상
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`sort-${formId}`}>정렬</Label>
          <Input
            id={`sort-${formId}`}
            name="sort_order"
            type="number"
            defaultValue={menu?.sort_order ?? 0}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={active} onCheckedChange={setActive} />
        <Label>활성</Label>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit">{menu ? "저장" : "메뉴 추가"}</Button>
        {menu ? (
          <Button type="button" variant="destructive" onClick={onDelete}>
            삭제
          </Button>
        ) : null}
      </div>
    </form>
  )
}

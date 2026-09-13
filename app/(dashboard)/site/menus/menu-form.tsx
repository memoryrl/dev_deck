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
import type { MenuItem } from "@/types/menu"

export function MenuForm({
  menu,
  menus,
  boards,
}: {
  menu?: MenuItem
  menus: MenuItem[]
  boards: Board[]
}) {
  const router = useRouter()
  const [active, setActive] = useState(menu?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)
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
  }

  async function onDelete() {
    if (!menu || !confirm("이 메뉴를 삭제할까요? 하위 메뉴도 함께 삭제됩니다.")) return
    await deleteMenu(menu.id)
    router.refresh()
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`label-${menu?.id ?? "new"}`}>이름</Label>
          <Input id={`label-${menu?.id ?? "new"}`} name="label" required defaultValue={menu?.label} />
        </div>
        <div>
          <Label htmlFor={`href-${menu?.id ?? "new"}`}>직접 링크</Label>
          <Input
            id={`href-${menu?.id ?? "new"}`}
            name="href"
            defaultValue={menu?.href ?? ""}
            placeholder="/work 또는 비움(하위 메뉴용)"
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`board-${menu?.id ?? "new"}`}>연결 게시판</Label>
          <select
            id={`board-${menu?.id ?? "new"}`}
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
          <Label htmlFor={`parent-${menu?.id ?? "new"}`}>상위 메뉴</Label>
          <select
            id={`parent-${menu?.id ?? "new"}`}
            name="parent_id"
            defaultValue={menu?.parent_id ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">최상위</option>
            {parents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor={`location-${menu?.id ?? "new"}`}>위치</Label>
          <select
            id={`location-${menu?.id ?? "new"}`}
            name="location"
            defaultValue={menu?.location ?? "header"}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="header">헤더</option>
            <option value="footer">푸터</option>
          </select>
        </div>
        <div>
          <Label htmlFor={`view-${menu?.id ?? "new"}`}>보이는 권한</Label>
          <select
            id={`view-${menu?.id ?? "new"}`}
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
          <Label htmlFor={`sort-${menu?.id ?? "new"}`}>정렬</Label>
          <Input
            id={`sort-${menu?.id ?? "new"}`}
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

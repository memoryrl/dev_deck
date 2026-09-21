"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { deleteMenu, upsertMenu } from "@/app/(dashboard)/site/actions"
import { ACCESS_ROLES, roleLabel, type AccessRole } from "@/lib/access"
import { Button } from "@/components/ui/button"
import { showConfirm } from "@/lib/ui/layer-dialog"
import { CustomSelect } from "@/components/ui/custom-select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { Board } from "@/types/board"
import type { MenuItem, MenuLocation } from "@/types/menu"
import { ADMIN_NAV_ICON_MAP } from "@/components/layout/admin-nav-icons"
import { MENU_LOCATIONS, menuLocationLabel } from "@/lib/menus/locations"
import { inferMenuLabelKey, parseMenuLabels } from "@/lib/menus/label"
import en from "@/locales/en.json"
import { t as tDict, type Messages } from "@/lib/i18n/t"

function englishDefault(menu?: MenuItem) {
  const labels = parseMenuLabels(menu?.labels, menu?.label)
  if (labels.en) return labels.en
  const key = menu?.label_key || (menu?.label ? inferMenuLabelKey(menu.label) : undefined)
  if (!key) return ""
  const translated = tDict(en as Messages, key)
  return translated && translated !== key ? translated : ""
}

export function MenuForm({
  menu,
  menus,
  boards,
  defaultParentId,
  defaultLocation,
  previewRole,
  onSaved,
  onDeleted,
}: {
  menu?: MenuItem
  menus: MenuItem[]
  boards: Board[]
  defaultParentId?: string | null
  defaultLocation?: MenuLocation
  previewRole?: AccessRole
  onSaved?: (id: string) => void
  onDeleted?: () => void
}) {
  const router = useRouter()
  const [active, setActive] = useState(menu?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)
  const formId = menu?.id ?? "new"
  const parents = menus.filter((item) => !item.parent_id && item.id !== menu?.id)
  const currentLocation = menu?.location ?? defaultLocation ?? "header"
  const locationParents = parents.filter((item) => item.location === currentLocation)

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
    if (!menu) return
    const ok = await showConfirm("이 메뉴를 삭제할까요? 하위 메뉴도 함께 삭제됩니다.", { destructive: true })
    if (!ok) return
    await deleteMenu(menu.id)
    router.refresh()
    onDeleted?.()
  }

  const labels = parseMenuLabels(menu?.labels, menu?.label)

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
        <div>
          <p className="text-sm font-semibold">다국어</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            사이트 언어에 따라 헤더·푸터·관리자 메뉴에 표시됩니다. 영어를 비우면 한국어를 사용합니다.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor={`label-ko-${formId}`}>한국어</Label>
            <Input
              id={`label-ko-${formId}`}
              name="label_ko"
              required
              defaultValue={labels.ko ?? menu?.label ?? ""}
            />
          </div>
          <div>
            <Label htmlFor={`label-en-${formId}`}>English</Label>
            <Input
              id={`label-en-${formId}`}
              name="label_en"
              defaultValue={englishDefault(menu)}
              placeholder="Optional"
            />
          </div>
        </div>
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
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor={`board-${formId}`}>연결 게시판</Label>
          <CustomSelect
            id={`board-${formId}`}
            name="board_id"
            defaultValue={menu?.board_id ?? ""}
            options={[
              { value: "", label: "없음 (직접 링크)" },
              ...boards.map((board) => ({ value: board.id, label: `${board.name} (/${board.slug})` })),
            ]}
          />
        </div>
        <div>
          <Label htmlFor={`parent-${formId}`}>상위 메뉴</Label>
          <CustomSelect
            id={`parent-${formId}`}
            name="parent_id"
            defaultValue={menu?.parent_id ?? defaultParentId ?? ""}
            options={[
              { value: "", label: "최상위" },
              ...locationParents.map((item) => ({
                value: item.id,
                label: `[${menuLocationLabel(item.location)}] ${item.label}`,
              })),
            ]}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor={`location-${formId}`}>위치</Label>
          <CustomSelect
            id={`location-${formId}`}
            name="location"
            defaultValue={menu?.location ?? defaultLocation ?? "header"}
            options={MENU_LOCATIONS.map((item) => ({
              value: item,
              label: menuLocationLabel(item),
            }))}
          />
        </div>
        <div>
          <Label htmlFor={`view-${formId}`}>보이는 권한</Label>
          <CustomSelect
            id={`view-${formId}`}
            name="view_role"
            defaultValue={
              menu?.view_role ??
              (currentLocation === "admin" ? "owner" : previewRole ?? "visitor")
            }
            options={ACCESS_ROLES.map((role) => ({ value: role, label: `${roleLabel(role)} 이상` }))}
          />
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
      <div>
        <Label htmlFor={`icon-${formId}`}>아이콘</Label>
        <CustomSelect
          id={`icon-${formId}`}
          name="icon"
          defaultValue={menu?.icon ?? ""}
          options={[
            { value: "", label: "없음" },
            ...Object.keys(ADMIN_NAV_ICON_MAP).map((name) => ({ value: name, label: name })),
          ]}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">관리자 사이드바에서 사용합니다. 헤더·푸터는 무시됩니다.</p>
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

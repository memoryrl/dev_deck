"use client"

import { useMemo, useState } from "react"
import { ChevronRight, FolderTree, Plus } from "lucide-react"
import { MenuForm } from "@/app/(dashboard)/site/menus/menu-form"
import { ACCESS_ROLES, roleAtLeast, roleLabel, type AccessRole } from "@/lib/access"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CustomSelect } from "@/components/ui/custom-select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { Board } from "@/types/board"
import type { MenuItem } from "@/types/menu"

type Selection =
  | { mode: "edit"; id: string }
  | { mode: "create"; parentId: string | null; location: "header" | "footer" }

type TreeNode = {
  item: MenuItem
  children: TreeNode[]
  visible: boolean
}

function buildTree(menus: MenuItem[], role: AccessRole): { header: TreeNode[]; footer: TreeNode[] } {
  const byParent = new Map<string | null, MenuItem[]>()
  for (const item of menus) {
    const key = item.parent_id
    const list = byParent.get(key) ?? []
    list.push(item)
    byParent.set(key, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, "ko"))
  }

  function walk(parentId: string | null): TreeNode[] {
    return (byParent.get(parentId) ?? []).map((item) => {
      const children = walk(item.id)
      const selfVisible = roleAtLeast(role, item.view_role)
      return {
        item,
        children,
        visible: selfVisible || children.some((child) => child.visible),
      }
    }).filter((node) => node.visible)
  }

  return {
    header: walk(null).filter((node) => node.item.location === "header"),
    footer: walk(null).filter((node) => node.item.location === "footer"),
  }
}

function roleTextClass(role: AccessRole) {
  if (role === "owner") return "text-rose-600 dark:text-rose-400"
  if (role === "member") return "text-blue-600 dark:text-blue-400"
  return "text-muted-foreground/70"
}

function collapseAllFolders(menus: MenuItem[]): Set<string> {
  const parentIds = new Set(menus.filter((item) => item.parent_id).map((item) => item.parent_id as string))
  return new Set(menus.filter((item) => parentIds.has(item.id)).map((item) => item.id))
}

export function MenusWorkspace({
  menus,
  boards,
}: {
  menus: MenuItem[]
  boards: Board[]
}) {
  const [role, setRole] = useState<AccessRole>("visitor")
  const [selection, setSelection] = useState<Selection>({
    mode: "create",
    parentId: null,
    location: "header",
  })
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => collapseAllFolders(menus))

  const toggleCollapsed = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const tree = useMemo(() => buildTree(menus, role), [menus, role])
  const selectedMenu =
    selection.mode === "edit" ? menus.find((item) => item.id === selection.id) : undefined

  const formKey =
    selection.mode === "edit"
      ? `edit-${selection.id}`
      : `create-${selection.parentId ?? "root"}-${selection.location}`

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:items-start">
      {/* 좌측: 권한 + 트리 */}
      <Card className="flex flex-col gap-4 p-4 sm:p-5 lg:sticky lg:top-6">
        <div>
          <Label htmlFor="menu-role-preview">미리보기 권한</Label>
          <CustomSelect
            id="menu-role-preview"
            value={role}
            onValueChange={(next) => setRole(next as AccessRole)}
            options={ACCESS_ROLES.map((item) => ({ value: item, label: `${roleLabel(item)} 에게 보이는 메뉴` }))}
            className="mt-1.5"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            선택한 역할 기준으로 트리에 표시되는 메뉴가 달라집니다.
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <FolderTree className="size-4" />
            메뉴 트리
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setSelection({ mode: "create", parentId: null, location: "header" })
            }
          >
            <Plus className="size-3.5" />
            새 메뉴
          </Button>
        </div>

        <div className="min-h-0 max-h-[24rem] flex-1 space-y-4 overflow-y-auto pr-1">
          {menus.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 메뉴가 없습니다. 우측에서 새 메뉴를 추가하세요.
            </p>
          ) : (
            <>
              <TreeSection
                sectionKey="section:header"
                title="헤더"
                nodes={tree.header}
                selectedId={selection.mode === "edit" ? selection.id : null}
                previewRole={role}
                collapsedIds={collapsedIds}
                onToggleCollapsed={toggleCollapsed}
                onSelect={(id) => setSelection({ mode: "edit", id })}
                onAddChild={(parentId) =>
                  setSelection({ mode: "create", parentId, location: "header" })
                }
              />
              <TreeSection
                sectionKey="section:footer"
                title="푸터"
                nodes={tree.footer}
                selectedId={selection.mode === "edit" ? selection.id : null}
                previewRole={role}
                collapsedIds={collapsedIds}
                onToggleCollapsed={toggleCollapsed}
                onSelect={(id) => setSelection({ mode: "edit", id })}
                onAddChild={(parentId) =>
                  setSelection({ mode: "create", parentId, location: "footer" })
                }
              />
            </>
          )}
        </div>
      </Card>

      {/* 우측: 상세 / 새 메뉴 */}
      <Card className="min-h-[32rem] space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="font-display text-xl font-bold">
            {selection.mode === "edit" ? "메뉴 편집" : "새 메뉴"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {selection.mode === "edit"
              ? selectedMenu
                ? `"${selectedMenu.label}" 상세 정보를 수정합니다.`
                : "선택한 메뉴를 찾을 수 없습니다."
              : selection.parentId
                ? "선택한 항목의 하위 메뉴를 추가합니다."
                : "최상위 메뉴를 추가합니다."}
          </p>
        </div>

        {selection.mode === "edit" && !selectedMenu ? (
          <p className="text-sm text-muted-foreground">왼쪽 트리에서 메뉴를 다시 선택하세요.</p>
        ) : (
          <MenuForm
            key={formKey}
            menu={selectedMenu}
            menus={menus}
            boards={boards}
            defaultParentId={selection.mode === "create" ? selection.parentId : undefined}
            defaultLocation={selection.mode === "create" ? selection.location : undefined}
            onDeleted={() =>
              setSelection({ mode: "create", parentId: null, location: "header" })
            }
            onSaved={(id) => setSelection({ mode: "edit", id })}
          />
        )}
      </Card>
    </div>
  )
}

function TreeSection({
  sectionKey,
  title,
  nodes,
  selectedId,
  previewRole,
  collapsedIds,
  onToggleCollapsed,
  onSelect,
  onAddChild,
}: {
  sectionKey: string
  title: string
  nodes: TreeNode[]
  selectedId: string | null
  previewRole: AccessRole
  collapsedIds: Set<string>
  onToggleCollapsed: (id: string) => void
  onSelect: (id: string) => void
  onAddChild: (parentId: string) => void
}) {
  const collapsed = collapsedIds.has(sectionKey)

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggleCollapsed(sectionKey)}
        disabled={nodes.length === 0}
        className="mb-1.5 flex w-full items-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground disabled:cursor-default"
      >
        {nodes.length > 0 ? (
          <ChevronRight
            className={cn("size-3 shrink-0 transition-transform", !collapsed && "rotate-90")}
          />
        ) : (
          <span className="size-3 shrink-0" />
        )}
        {title}
      </button>
      {nodes.length === 0 ? (
        <p className="px-2 py-2 text-xs text-muted-foreground">표시할 메뉴 없음</p>
      ) : !collapsed ? (
        <ul className="space-y-0.5">
          {nodes.map((node) => (
            <TreeItem
              key={node.item.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              previewRole={previewRole}
              collapsedIds={collapsedIds}
              onToggleCollapsed={onToggleCollapsed}
              onSelect={onSelect}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function TreeItem({
  node,
  depth,
  selectedId,
  previewRole,
  collapsedIds,
  onToggleCollapsed,
  onSelect,
  onAddChild,
}: {
  node: TreeNode
  depth: number
  selectedId: string | null
  previewRole: AccessRole
  collapsedIds: Set<string>
  onToggleCollapsed: (id: string) => void
  onSelect: (id: string) => void
  onAddChild: (parentId: string) => void
}) {
  const selected = selectedId === node.item.id
  const selfVisible = roleAtLeast(previewRole, node.item.view_role)
  const hasChildren = node.children.length > 0
  const collapsed = hasChildren && collapsedIds.has(node.item.id)

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
          selected ? "bg-foreground/[0.08]" : "hover:bg-foreground/[0.04]",
          !selfVisible && "opacity-50"
        )}
        style={{ paddingLeft: `${depth * 0.85 + 0.25}rem` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggleCollapsed(node.item.id)}
          disabled={!hasChildren}
          aria-label={hasChildren ? (collapsed ? "펼치기" : "접기") : undefined}
          className="flex size-6 shrink-0 items-center justify-center rounded disabled:cursor-default"
        >
          {hasChildren ? (
            <ChevronRight
              className={cn(
                "size-3.5 text-muted-foreground transition-transform",
                !collapsed && "rotate-90"
              )}
            />
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => onSelect(node.item.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-2 pr-2 text-left text-sm"
        >
          <span className="truncate font-medium">{node.item.label}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1 pl-2">
            {!node.item.is_active ? (
              <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                비활성
              </Badge>
            ) : null}
            <span className={cn("text-[10px] font-medium tabular-nums", roleTextClass(node.item.view_role))}>
              {roleLabel(node.item.view_role)}+
            </span>
          </span>
        </button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 opacity-0 group-hover:opacity-100"
          onClick={() => onAddChild(node.item.id)}
          aria-label="하위 메뉴 추가"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
      {hasChildren && !collapsed ? (
        <ul>
          {node.children.map((child) => (
            <TreeItem
              key={child.item.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              previewRole={previewRole}
              collapsedIds={collapsedIds}
              onToggleCollapsed={onToggleCollapsed}
              onSelect={onSelect}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

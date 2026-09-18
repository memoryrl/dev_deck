import { boardPath } from "@/lib/access"
import type { MenuItem, NavNode } from "@/types/menu"

export function resolveMenuHref(item: Pick<MenuItem, "href" | "boards">) {
  if (item.boards?.slug) return boardPath(item.boards.slug)
  const href = item.href?.trim() || null
  // 랜딩 해시는 같은 페이지라 클릭이 무시됨 — Top 10 시상식 화면으로 보낸다.
  if (href === "/#games") return "/games/top"
  return href
}

export function treeMenus(items: MenuItem[]): NavNode[] {
  const childrenOf = new Map<string | null, MenuItem[]>()
  for (const item of items) {
    const key = item.parent_id
    const list = childrenOf.get(key) ?? []
    list.push(item)
    childrenOf.set(key, list)
  }
  Array.from(childrenOf.values()).forEach((list) => {
    list.sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, "ko"))
  })

  return (childrenOf.get(null) ?? [])
    .filter((item) => !item.board_id || item.boards?.is_active !== false)
    .map((item) => {
      const kids = (childrenOf.get(item.id) ?? [])
        .filter((child) => !child.board_id || child.boards?.is_active !== false)
        .map((child) => ({
          id: child.id,
          label: child.label,
          href: resolveMenuHref(child) ?? "/",
        }))
      return {
        id: item.id,
        label: item.label,
        href: kids.length > 0 ? null : resolveMenuHref(item),
        children: kids,
      }
    })
}

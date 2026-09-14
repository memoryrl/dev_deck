import type { Comment, CommentNode } from "@/types/comment"

export function nestComments(rows: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>()
  for (const row of rows) {
    map.set(row.id, { ...row, children: [] })
  }
  const roots: CommentNode[] = []
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  function sortTree(list: CommentNode[]) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at))
    list.forEach((item) => sortTree(item.children))
  }
  sortTree(roots)
  return roots
}

export function countComments(nodes: CommentNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countComments(node.children), 0)
}

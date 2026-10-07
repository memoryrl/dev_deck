import type { Comment, CommentNode } from "@/types/comment"

export function nestComments(rows: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>()
  for (const row of rows) {
    map.set(row.id, { ...row, children: [] })
  }
  const roots: CommentNode[] = []
  for (const node of Array.from(map.values())) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  function sortTree(list: CommentNode[]) {
    // 문자열 비교는 "+00:00"/"Z", 소수점 자릿수가 다르면 시간순이 어긋난다 — 실제 시각으로 비교한다.
    list.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id))
    list.forEach((item) => sortTree(item.children))
  }
  sortTree(roots)
  return roots
}

export function countComments(nodes: CommentNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countComments(node.children), 0)
}

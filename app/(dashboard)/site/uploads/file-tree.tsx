"use client"
import { kstParts } from "@/lib/datetime"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Folder, FolderOpen, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { KIND_META, kindOf, type ManagedFile } from "./file-types"

// kware_aew 첨부파일 탐색기의 좌측 트리: 폴더 계층 + 검색 + 선택 강조. devdeck에서는 폴더 = 업로드 연·월이다.
type TreeNode = { key: string; label: string; count: number; children: TreeNode[]; files: ManagedFile[] }

const monthKey = (iso: string) => {
  const { year, month } = kstParts(new Date(iso))
  return { year, month }
}

function buildTree(files: ManagedFile[]): TreeNode[] {
  const years = new Map<string, Map<string, ManagedFile[]>>()
  for (const file of files) {
    const { year, month } = monthKey(file.createdAt)
    const months = years.get(year) ?? new Map<string, ManagedFile[]>()
    months.set(month, [...(months.get(month) ?? []), file])
    years.set(year, months)
  }
  return [...years.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, months]) => {
      const children = [...months.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, list]) => ({ key: `${year}-${month}`, label: `${month}월`, count: list.length, children: [], files: list }))
      return { key: year, label: `${year}년`, count: children.reduce((n, c) => n + c.count, 0), children, files: [] }
    })
}

export function FileTree({ files, selectedId, onSelect }: { files: ManagedFile[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState("")
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set()) // 기본은 모두 펼침(aew의 FILE_TREE_EXPAND_MODE='all')
  const needle = filter.trim().toLowerCase()

  const tree = useMemo(() => buildTree(needle ? files.filter((f) => f.name.toLowerCase().includes(needle)) : files), [files, needle])
  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const renderNode = (node: TreeNode, depth: number) => {
    // 검색 중에는 접힘 상태와 상관없이 매칭 경로를 펼친다.
    const open = needle ? true : !collapsed.has(node.key)
    return (
      <li key={node.key}>
        <button
          type="button"
          onClick={() => toggle(node.key)}
          aria-expanded={open}
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm font-semibold hover:bg-muted"
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          {open ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
          {open ? <FolderOpen className="size-4 shrink-0 text-[hsl(var(--lux-cognac))]" /> : <Folder className="size-4 shrink-0 text-[hsl(var(--lux-cognac))]" />}
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
          <span className="shrink-0 rounded-full bg-muted px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">{node.count}</span>
        </button>
        {open ? (
          <ul>
            {node.children.map((child) => renderNode(child, depth + 1))}
            {node.files.map((file) => {
              const Icon = KIND_META[kindOf(file)].icon
              const active = file.id === selectedId
              return (
                <li key={file.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(file.id)}
                    aria-current={active}
                    title={file.name}
                    className={cn("flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-sm transition-colors hover:bg-muted", active && "bg-foreground/[0.07] font-semibold")}
                    style={{ paddingLeft: 8 + (depth + 1) * 14 + 18 }}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </li>
    )
  }

  return (
    <aside className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-xl border bg-white py-2.5 dark:bg-card lg:max-h-[calc(100dvh-9rem)]">
      <h2 className="border-b px-3 pb-2.5 pt-1 text-[13px] font-bold text-muted-foreground">파일 탐색</h2>
      <div className="relative mx-2 my-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="파일명 검색"
          aria-label="파일명 검색"
          className="h-9 w-full rounded-lg border bg-[hsl(var(--field))] pl-8 pr-8 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {filter ? (
          <button type="button" onClick={() => setFilter("")} aria-label="검색 지우기" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted">
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1">
        {tree.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">{needle ? "검색 결과가 없습니다." : "업로드한 파일이 없습니다."}</p>
        ) : (
          <ul>{tree.map((node) => renderNode(node, 0))}</ul>
        )}
      </div>
    </aside>
  )
}

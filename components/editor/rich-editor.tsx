"use client"

import dynamic from "next/dynamic"

export const RichEditor = dynamic(
  () => import("./rich-editor-client").then((mod) => mod.RichEditorClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-64 items-center justify-center rounded-xl border bg-muted/25 text-sm text-muted-foreground">
        편집기를 불러오는 중…
      </div>
    ),
  }
)

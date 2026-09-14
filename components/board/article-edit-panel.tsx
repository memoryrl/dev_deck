"use client"

import { useState, type ReactNode } from "react"
import { Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ArticleEditPanel({
  label = "편집",
  form,
  children,
}: {
  label?: string
  form: ReactNode
  children: ReactNode
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          size="sm"
          variant={editing ? "outline" : "default"}
          onClick={() => setEditing((value) => !value)}
        >
          {editing ? <X /> : <Pencil />}
          {editing ? "취소" : label}
        </Button>
      </div>
      {editing ? <div className="mt-6">{form}</div> : <div className="mt-5">{children}</div>}
    </div>
  )
}

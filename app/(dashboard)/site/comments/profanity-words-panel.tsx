"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function ProfanityWordsPanel({
  total,
  children,
}: {
  total: number
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold">욕설 치환 단어</h2>
          {!expanded ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {total > 0 ? `등록 ${total}건` : "등록된 단어 없음"}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={expanded ? "욕설 치환 단어 숨기기" : "욕설 치환 단어 펼치기"}
        >
          {expanded ? (
            <>
              <ChevronUp />
              Hide
            </>
          ) : (
            <>
              <ChevronDown />
              Show
            </>
          )}
        </Button>
      </div>

      {expanded ? <div className="space-y-4">{children}</div> : null}
    </Card>
  )
}

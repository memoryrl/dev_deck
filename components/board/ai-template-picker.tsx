"use client"

import { Sparkles } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { generateBoardTemplate } from "@/app/(public)/b/actions"
import { templatesForBoard } from "@/lib/boards/ai-templates"
import { Button } from "@/components/ui/button"
import { showConfirm } from "@/lib/ui/layer-dialog"
import { cn } from "@/lib/utils"

/**
 * 글쓰기 폼 에디터 위에 붙는 "AI 템플릿" 버튼. 목록은 게시판마다 고정돼 있어 바로 보여주고,
 * 고른 템플릿의 실제 본문만 로컬 LLM에 요청한다(generateBoardTemplate).
 * 패널은 버튼을 밀지 않고, 버튼 우측 라인에 맞춰 아래로 오버레이한다.
 */
export function AiTemplatePicker({
  boardId,
  boardSlug,
  hasContent,
  onGenerated,
  onGeneratingChange,
}: {
  boardId: string
  boardSlug: string
  /** 클릭 시점 기준으로 판단해야 해서(타이핑 중일 수 있음) 값이 아니라 함수로 받는다. */
  hasContent: () => boolean
  onGenerated: (html: string) => void
  /** 생성 중엔 에디터를 잠그라고 부모에게 알린다(true→시작, false→끝). */
  onGeneratingChange?: (generating: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const templates = templatesForBoard(boardSlug)
  const generating = pendingId !== null

  useEffect(() => {
    // 생성 중엔 바깥 클릭·Esc로도 안 닫는다 — 결과를 놓치지 않게 강제로 붙잡아 둔다.
    if (!open || generating) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, generating])

  async function pick(templateId: string) {
    if (hasContent()) {
      const ok = await showConfirm("지금 쓰고 있는 본문을 AI 템플릿으로 바꿀까요? 되돌릴 수 없습니다.", {
        destructive: true,
      })
      if (!ok) return
    }

    setPendingId(templateId)
    setError(null)
    onGeneratingChange?.(true)
    const result = await generateBoardTemplate(boardId, templateId)
    setPendingId(null)
    onGeneratingChange?.(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    onGenerated(result.html)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative z-20 inline-flex flex-col items-end">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        disabled={generating}
        onClick={() => {
          if (generating) return
          setOpen((value) => !value)
        }}
      >
        <Sparkles className="size-3.5" />
        AI 템플릿
      </Button>

      {open ? (
        <div
          className={cn(
            "absolute right-0 top-full z-50 mt-1.5 w-[min(20rem,calc(100vw-2rem))]",
            // 생성 중엔 2px 여백을 두고 그 틈으로 회전하는 conic-gradient가 테두리처럼 비치게 한다.
            generating &&
              "relative overflow-hidden rounded-xl p-[2px] before:absolute before:inset-[-150%] before:animate-spin before:content-[''] before:[background:conic-gradient(from_0deg,transparent,hsl(var(--lux-cognac)),transparent_40%)]"
          )}
        >
          <div
            className={cn(
              "relative z-10 rounded-xl bg-popover p-2 shadow-lg",
              generating ? "ring-1 ring-border" : "border"
            )}
          >
            <p className="px-2 pb-1.5 pt-1 text-xs text-muted-foreground">
              고르면 저장된 양식을 바로 넣고, 없을 때만 AI가 초안을 만듭니다.
            </p>
            <div className="space-y-1">
              {templates.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={generating}
                  onClick={() => void pick(option.id)}
                  className={cn(
                    "w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent disabled:opacity-60",
                    pendingId === option.id && "bg-accent"
                  )}
                >
                  <p className="text-sm font-medium text-foreground">
                    {pendingId === option.id ? "생성 중…" : option.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
            {error ? <p className="px-2 pt-1.5 text-xs text-destructive">{error}</p> : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 w-full"
              disabled={generating}
              onClick={() => setOpen(false)}
            >
              닫기
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

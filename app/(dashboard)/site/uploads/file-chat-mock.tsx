"use client"

import { useState } from "react"
import { Bot, Send } from "lucide-react"

// kware_aew 파일 탐색기 우측의 "AI 어시스턴트" 자리 — aew도 이번 범위는 목업(백엔드 연동 없음)이다.
// devdeck에는 로컬 Ollama(/site/ollama-chat)가 있어 모델 선택지만 그에 맞췄다. 실제 대화는 후속 작업.
export function FileChatMock({ fileName }: { fileName: string | null }) {
  const [model, setModel] = useState("ollama")
  return (
    <section aria-label="AI 어시스턴트" className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-xl border bg-white dark:bg-card">
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <Bot className="size-4" />
          AI 어시스턴트
        </h3>
        <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="모델 선택" className="h-7 rounded-md border bg-[hsl(var(--field))] px-2 text-xs">
          <option value="ollama">로컬 모델 (Ollama)</option>
          <option value="hosted" disabled>
            호스팅 모델 (준비 중)
          </option>
        </select>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-5 text-center">
        <p className="text-sm font-semibold">AI 어시스턴트는 준비 중입니다</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {fileName ? `‘${fileName}’ 내용을 바탕으로 한 ` : ""}문서 기반 질의응답과 연관 파일 추천 기능이 추후 제공될 예정입니다.
        </p>
      </div>
      <div className="flex items-center gap-2 border-t p-2.5">
        <input disabled placeholder="메시지를 입력하세요 (준비 중)" aria-label="메시지 입력" className="h-9 min-w-0 flex-1 rounded-lg border bg-muted/50 px-3 text-sm" />
        <button type="button" disabled aria-label="전송" className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground text-background opacity-40">
          <Send className="size-4" />
        </button>
      </div>
    </section>
  )
}

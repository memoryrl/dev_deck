"use client"

import { Bot, RotateCcw, Send, User } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { sendOllamaMessage } from "@/app/(dashboard)/site/ollama-chat/actions"
import { Button } from "@/components/ui/button"
import { CustomSelect } from "@/components/ui/custom-select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
  model?: string
  durationMs?: number
}

export function OllamaChatPanel({ models, ollamaOffline }: { models: string[]; ollamaOffline: boolean }) {
  const [model, setModel] = useState(models[0] ?? "")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "end" })
  }, [messages, pending])

  async function handleSend() {
    const content = draft.trim()
    if (!content || pending || !model) return

    const next = [...messages, { role: "user" as const, content }]
    setMessages(next)
    setDraft("")
    setPending(true)
    setError(null)

    const result = await sendOllamaMessage(
      model,
      next.map(({ role, content }) => ({ role, content }))
    )
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessages((current) => [
      ...current,
      { role: "assistant", content: result.content, model, durationMs: result.durationMs },
    ])
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-18rem)] min-h-[28rem] w-full flex-col overflow-hidden rounded-3xl border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3.5">
        <CustomSelect
          value={model}
          onValueChange={setModel}
          options={models.map((name) => ({ value: name, label: name }))}
          triggerClassName="w-56"
          aria-label="테스트할 모델"
        />
        {ollamaOffline ? (
          <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
            Ollama 서버에 연결할 수 없습니다 — 설치된 모델 목록을 못 불러와 기본값을 보여줍니다.
          </span>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={messages.length === 0}
          onClick={() => {
            setMessages([])
            setError(null)
          }}
        >
          <RotateCcw />
          대화 지우기
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            메시지를 보내서 {model || "모델"}과 대화를 시작하세요.
          </p>
        ) : (
          messages.map((message, index) => <ChatBubble key={index} message={message} />)
        )}
        {pending ? (
          <div className="flex items-start gap-2.5">
            <BubbleIcon role="assistant" />
            <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              생성 중…
            </div>
          </div>
        ) : null}
        <div ref={listEndRef} />
      </div>

      {error ? <p className="border-t px-5 py-2 text-xs text-destructive">{error}</p> : null}

      <div className="flex items-end gap-3 border-t px-5 py-4">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요 (Shift+Enter로 줄바꿈)"
          rows={2}
          className="resize-none"
          disabled={pending}
        />
        <Button type="button" onClick={handleSend} disabled={pending || !draft.trim()}>
          <Send />
          보내기
        </Button>
      </div>
    </div>
  )
}

function BubbleIcon({ role }: { role: ChatMessage["role"] }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        role === "user" ? "bg-primary/10 text-primary" : "bg-muted text-foreground/70"
      )}
    >
      {role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex items-start gap-2.5", isUser && "flex-row-reverse")}>
      <BubbleIcon role={message.role} />
      <div className={cn("max-w-[75%] space-y-1", isUser && "items-end text-right")}>
        <div
          className={cn(
            "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-muted text-foreground"
          )}
        >
          {message.content}
        </div>
        {message.model ? (
          <p className="px-1 text-[11px] text-muted-foreground">
            {message.model}
            {typeof message.durationMs === "number" ? ` · ${(message.durationMs / 1000).toFixed(1)}초` : ""}
          </p>
        ) : null}
      </div>
    </div>
  )
}

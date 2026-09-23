"use client"

import { Bot, MessageCircle, RotateCcw, Send, User, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { askPortfolio } from "@/lib/portfolio-assistant/actions"
import { useI18n } from "@/components/i18n/i18n-provider"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type ChatMessage = { role: "user" | "assistant"; content: string; model?: string }

export function PortfolioAskWidget({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) listEndRef.current?.scrollIntoView({ block: "end" })
  }, [open, messages, pending])

  async function send(content: string) {
    const text = content.trim()
    if (!text || pending || !signedIn) return

    const next = [...messages, { role: "user" as const, content: text }]
    setMessages(next)
    setDraft("")
    setPending(true)
    setError(null)

    const result = await askPortfolio(next.map(({ role, content }) => ({ role, content })))
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessages((current) => [...current, { role: "assistant", content: result.content, model: result.model }])
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void send(draft)
    }
  }

  const samples = [t("portfolioAsk.sample1"), t("portfolioAsk.sample2"), t("portfolioAsk.sample3")]

  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-40">
      {open ? (
        <div className="mb-3 flex h-[min(32rem,70dvh)] w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border bg-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-2 border-b px-4 py-3.5">
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-foreground">{t("portfolioAsk.title")}</p>
              <p className="truncate text-xs text-muted-foreground">{t("portfolioAsk.subtitle")}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={messages.length === 0}
                aria-label={t("portfolioAsk.clear")}
                onClick={() => {
                  setMessages([])
                  setError(null)
                }}
              >
                <RotateCcw className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={t("portfolioAsk.close")}
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <BubbleIcon role="assistant" />
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2 text-sm text-foreground">
                    {signedIn ? t("portfolioAsk.greeting") : t("portfolioAsk.memberOnly")}
                  </div>
                </div>
                {signedIn ? (
                  <div className="flex flex-wrap gap-1.5 pl-9">
                    {samples.map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => void send(sample)}
                        className="rounded-full border border-input px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="pl-9">
                    <Button asChild size="sm" className="rounded-full">
                      <Link href="/login">{t("portfolioAsk.loginToAsk")}</Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              messages.map((message, index) => <ChatBubble key={index} message={message} />)
            )}
            {pending ? (
              <div className="flex items-start gap-2">
                <BubbleIcon role="assistant" />
                <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2 text-sm text-muted-foreground">
                  {t("portfolioAsk.thinking")}
                </div>
              </div>
            ) : null}
            <div ref={listEndRef} />
          </div>

          {error ? <p className="border-t px-4 py-2 text-xs text-destructive">{error}</p> : null}

          <div className="space-y-2 border-t px-4 py-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={signedIn ? t("portfolioAsk.placeholder") : t("portfolioAsk.memberOnly")}
                rows={1}
                className="min-h-9 resize-none py-2 text-sm"
                disabled={pending || !signedIn}
              />
              <Button
                type="button"
                size="icon"
                aria-label={t("portfolioAsk.send")}
                onClick={() => void send(draft)}
                disabled={pending || !signedIn || !draft.trim()}
              >
                <Send className="size-4" />
              </Button>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{t("portfolioAsk.disclaimer")}</p>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-12 gap-2 rounded-full px-5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.4)]"
        aria-expanded={open}
        aria-label={open ? t("portfolioAsk.close") : t("portfolioAsk.open")}
      >
        {open ? <X className="size-4" /> : <MessageCircle className="size-4" />}
        <span className="hidden sm:inline">{t("portfolioAsk.open")}</span>
      </Button>
    </div>
  )
}

function BubbleIcon({ role }: { role: ChatMessage["role"] }) {
  return (
    <div
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full",
        role === "user" ? "bg-primary/10 text-primary" : "bg-muted text-foreground/70"
      )}
    >
      {role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex items-start gap-2", isUser && "flex-row-reverse")}>
      <BubbleIcon role={message.role} />
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          isUser ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted text-foreground"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

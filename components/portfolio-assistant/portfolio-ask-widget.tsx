"use client"

import { Bot, MessageCircle, RotateCcw, Send, User, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { askPortfolio, loadPortfolioAskHistory } from "@/lib/portfolio-assistant/actions"
import { useI18n } from "@/components/i18n/i18n-provider"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatBoardDateTime } from "@/lib/i18n/format"
import type { AppLocale } from "@/lib/i18n/config"
import { cn } from "@/lib/utils"

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; model?: string; at: string }
type HistoryCursor = { createdAt: string; id: string }
type HistoryCycle = { id: string; question: string; answer: string; model: string; createdAt: string }

const INITIAL_CYCLES = 2
const MORE_CYCLES = 4
const ETA_KEY = "devdeck.portfolio-ask.eta-ms"
const DEFAULT_ETA_MS = 15_000
const MIN_ETA_MS = 4_000
const MAX_ETA_MS = 60_000

function cyclesToMessages(cycles: HistoryCycle[]): ChatMessage[] {
  return cycles.flatMap((cycle) => [
    { id: `${cycle.id}-q`, role: "user" as const, content: cycle.question, at: cycle.createdAt },
    { id: `${cycle.id}-a`, role: "assistant" as const, content: cycle.answer, model: cycle.model, at: cycle.createdAt },
  ])
}

function readEtaMs() {
  if (typeof window === "undefined") return DEFAULT_ETA_MS
  const raw = Number(window.localStorage.getItem(ETA_KEY))
  if (!Number.isFinite(raw)) return DEFAULT_ETA_MS
  return Math.min(MAX_ETA_MS, Math.max(MIN_ETA_MS, raw))
}

function rememberEtaMs(durationMs: number) {
  if (typeof window === "undefined" || !Number.isFinite(durationMs) || durationMs < 400) return
  const next = Math.round(readEtaMs() * 0.6 + durationMs * 0.4)
  window.localStorage.setItem(ETA_KEY, String(Math.min(MAX_ETA_MS, Math.max(MIN_ETA_MS, next))))
}

export function PortfolioAskWidget({ signedIn }: { signedIn: boolean }) {
  const { t, locale } = useI18n()
  const [etaMs, setEtaMs] = useState(DEFAULT_ETA_MS)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyReady, setHistoryReady] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<HistoryCursor | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listEndRef = useRef<HTMLDivElement>(null)
  const seenIds = useRef(new Set<string>())
  const pinToBottom = useRef(true)

  useEffect(() => {
    if (!open || !signedIn || historyReady || loadingHistory) return
    void loadHistory(null)
  }, [open, signedIn, historyReady, loadingHistory])

  useEffect(() => {
    if (open && !loadingHistory && pinToBottom.current) {
      listEndRef.current?.scrollIntoView({ block: "end" })
    }
  }, [open, messages, pending, loadingHistory])

  async function loadHistory(nextCursor: HistoryCursor | null) {
    if (!signedIn || loadingHistory) return
    const list = listRef.current
    const previousHeight = list?.scrollHeight ?? 0
    const previousTop = list?.scrollTop ?? 0
    const prepend = nextCursor !== null
    pinToBottom.current = !prepend

    setLoadingHistory(true)
    setError(null)
    const result = await loadPortfolioAskHistory(nextCursor, prepend ? MORE_CYCLES : INITIAL_CYCLES)
    setLoadingHistory(false)

    if (!result.ok) {
      setError(result.error)
      setHistoryReady(true)
      return
    }

    const fresh = result.cycles.filter((cycle) => {
      if (seenIds.current.has(cycle.id)) return false
      seenIds.current.add(cycle.id)
      return true
    })
    const chronological = cyclesToMessages([...fresh].reverse())
    setMessages((current) => (prepend ? [...chronological, ...current] : chronological))
    setHasMore(result.hasMore)
    setCursor(result.nextCursor)
    setHistoryReady(true)

    if (prepend && list) {
      requestAnimationFrame(() => {
        list.scrollTop = list.scrollHeight - previousHeight + previousTop
      })
    }
  }

  async function send(content: string) {
    const text = content.trim()
    if (!text || pending || !signedIn) return

    pinToBottom.current = true
    const askedAt = new Date().toISOString()
    const userMessage: ChatMessage = { id: `local-${Date.now()}`, role: "user", content: text, at: askedAt }
    const next = [...messages, userMessage]
    setMessages(next)
    setDraft("")
    setPending(true)
    setError(null)
    setEtaMs(readEtaMs())

    const result = await askPortfolio(next.map(({ role, content: body }) => ({ role, content: body })))
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    rememberEtaMs(result.durationMs)
    setEtaMs(readEtaMs())
    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}-a`,
        role: "assistant",
        content: result.content,
        model: result.model,
        at: new Date().toISOString(),
      },
    ])
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void send(draft)
    }
  }

  function resetView() {
    seenIds.current = new Set()
    setMessages([])
    setError(null)
    setHasMore(false)
    setCursor(null)
    setHistoryReady(false)
  }

  const samples = [t("portfolioAsk.sample1"), t("portfolioAsk.sample2"), t("portfolioAsk.sample3")]
  const showGreeting = historyReady && messages.length === 0 && !loadingHistory

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
                onClick={resetView}
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

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {signedIn && (hasMore || (loadingHistory && historyReady)) ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={loadingHistory || !cursor}
                  onClick={() => void loadHistory(cursor)}
                >
                  {loadingHistory ? t("portfolioAsk.loadingHistory") : t("portfolioAsk.loadMore")}
                </Button>
              </div>
            ) : null}

            {signedIn && !historyReady && loadingHistory ? (
              <p className="text-center text-xs text-muted-foreground">{t("portfolioAsk.loadingHistory")}</p>
            ) : null}

            {showGreeting ? (
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
            ) : null}

            {!signedIn ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <BubbleIcon role="assistant" />
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2 text-sm text-foreground">
                    {t("portfolioAsk.memberOnly")}
                  </div>
                </div>
                <div className="pl-9">
                  <Button asChild size="sm" className="rounded-full">
                    <Link href="/login">{t("portfolioAsk.loginToAsk")}</Link>
                  </Button>
                </div>
              </div>
            ) : null}

            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} locale={locale} />
            ))}
            {pending ? <ThinkingBubble estimateMs={etaMs} thinking={t("portfolioAsk.thinking")} /> : null}
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

function ChatBubble({ message, locale }: { message: ChatMessage; locale: AppLocale }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex items-start gap-2", isUser && "flex-row-reverse")}>
      <BubbleIcon role={message.role} />
      <div className="max-w-[80%] min-w-0">
        <div
          className={cn(
            "whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
            isUser ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted text-foreground"
          )}
        >
          {message.content}
        </div>
        <p
          className={cn(
            "mt-1 text-[11px] tabular-nums leading-snug text-muted-foreground",
            isUser && "text-right"
          )}
        >
          {formatBoardDateTime(message.at, locale)}
        </p>
      </div>
    </div>
  )
}

function ThinkingBubble({ estimateMs, thinking }: { estimateMs: number; thinking: string }) {
  const { t } = useI18n()
  const startedAt = useRef(Date.now())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])

  const elapsed = now - startedAt.current
  const remainMs = Math.max(0, estimateMs - elapsed)
  const remainSec = Math.ceil(remainMs / 1000)
  const progress = Math.min(100, Math.round((elapsed / Math.max(estimateMs, 1)) * 100))

  return (
    <div className="flex items-start gap-2">
      <BubbleIcon role="assistant" />
      <div className="max-w-[80%] min-w-0 rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2 text-sm text-muted-foreground">
        <p>{thinking}</p>
        <p className="mt-1 text-[11px] tabular-nums">
          {remainSec > 0 ? t("portfolioAsk.thinkingEta", { seconds: remainSec }) : t("portfolioAsk.thinkingEtaSoon")}
        </p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full bg-foreground/35 transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}

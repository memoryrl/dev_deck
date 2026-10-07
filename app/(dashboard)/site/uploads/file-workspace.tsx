"use client"

import { useEffect, useState } from "react"
import { Check, Copy, Download, ExternalLink, Loader2 } from "lucide-react"
import { Markdown } from "@/components/ui/markdown"
import { cn } from "@/lib/utils"
import { FileChatMock } from "./file-chat-mock"
import { FileTree } from "./file-tree"
import { extOf, formatBytes, isPreviewable, KIND_META, kindOf, type ManagedFile } from "./file-types"

// kware_aew 첨부파일 탐색기와 같은 구성: 좌측 파일 트리 / 우측 상단 파일 정보 카드 /
// 그 아래 [미리보기·텍스트 보기 탭 | AI 어시스턴트]. 선택한 파일은 주소(?fileId=)에도 남겨 새로고침·공유 때 복원된다.
const TEXT_LIMIT = 200_000
const DATE_FMT = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" })
type Tab = "preview" | "text"
type TextState = { status: "idle" | "loading" | "done" | "error"; text: string; truncated: boolean }

export function FileWorkspace({ files, initialId }: { files: ManagedFile[]; initialId: string | null }) {
  const [selectedId, setSelectedId] = useState<string | null>(() => (initialId && files.some((f) => f.id === initialId) ? initialId : null))
  const [tab, setTab] = useState<Tab>("preview")
  const [copied, setCopied] = useState(false)
  const [content, setContent] = useState<TextState>({ status: "idle", text: "", truncated: false })

  const file = files.find((f) => f.id === selectedId) ?? null
  const kind = file ? kindOf(file) : null
  const textual = kind === "text" || kind === "markdown"

  const select = (id: string) => {
    setSelectedId(id)
    setTab("preview")
    const url = new URL(window.location.href)
    url.searchParams.set("fileId", id)
    window.history.replaceState(null, "", url)
  }

  // 텍스트 계열 파일은 선택하면 내용을 가져온다(앞 200KB까지).
  useEffect(() => {
    if (!file || !textual) {
      setContent({ status: "idle", text: "", truncated: false })
      return
    }
    let cancelled = false
    setContent({ status: "loading", text: "", truncated: false })
    fetch(file.url)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
      .then((text) => !cancelled && setContent({ status: "done", text: text.slice(0, TEXT_LIMIT), truncated: text.length > TEXT_LIMIT }))
      .catch(() => !cancelled && setContent({ status: "error", text: "", truncated: false }))
    return () => {
      cancelled = true
    }
  }, [file, textual])

  const copyUrl = async () => {
    if (!file) return
    try {
      await navigator.clipboard.writeText(file.url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // 클립보드 권한이 없으면 조용히 넘어간다.
    }
  }

  const KindIcon = kind ? KIND_META[kind].icon : null
  const previewable = kind ? isPreviewable(kind) : false

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <FileTree files={files} selectedId={selectedId} onSelect={select} />

      <div className="flex min-w-0 flex-col gap-4">
        {!file || !kind || !KindIcon ? (
          <div className="flex min-h-[400px] flex-1 items-center justify-center rounded-xl border border-dashed bg-muted/30 text-sm text-muted-foreground">
            {files.length === 0 ? "업로드한 파일이 없습니다. 위의 ‘파일 업로드’로 추가해 보세요." : "좌측 트리에서 파일을 선택하세요."}
          </div>
        ) : (
          <>
            <section aria-label="파일 정보" className="overflow-hidden rounded-xl border bg-white dark:bg-card">
              <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3 border-b bg-gradient-to-b from-[hsl(var(--lux-champagne)/0.12)] to-transparent px-5 py-4">
                <div className="flex min-w-0 flex-1 basis-60 items-start gap-3.5">
                  <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-[hsl(var(--lux-champagne)/0.25)] text-[hsl(var(--lux-cognac))]">
                    <KindIcon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="break-words font-display text-lg font-bold leading-snug" title={file.name}>
                      {file.name}
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      {extOf(file.name) ? <span className="rounded-md bg-muted px-1.5 py-0.5 font-semibold uppercase">{extOf(file.name)}</span> : null}
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-semibold">{KIND_META[kind].label}</span>
                      <span className={cn("rounded-full px-2 py-0.5 font-semibold", previewable ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                        {previewable ? "미리보기 가능" : "다운로드 전용"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <a href={`${file.url}?download=${encodeURIComponent(file.name)}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-xs font-semibold text-background hover:bg-foreground/90">
                    <Download className="size-3.5" />
                    원본 다운로드
                  </a>
                  <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold hover:bg-muted">
                    <ExternalLink className="size-3.5" />
                    새 탭
                  </a>
                  <button type="button" onClick={copyUrl} className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold hover:bg-muted">
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? "복사됨" : "URL 복사"}
                  </button>
                </div>
              </div>
              <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["업로드 일시", DATE_FMT.format(new Date(file.createdAt))],
                  ["크기", formatBytes(file.size)],
                  ["형식", file.mime || "-"],
                  ["저장 경로", file.objectPath],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 break-all" title={value}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                <div role="tablist" className="inline-flex rounded-full bg-muted p-0.5 text-sm font-semibold">
                  {([["preview", "미리보기"], ["text", "텍스트 보기"]] as const).map(([id, label]) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn("rounded-full px-4 py-1.5 transition-colors", tab === id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 min-h-[320px] overflow-auto rounded-xl border bg-white p-4 dark:bg-card xl:max-h-[calc(100dvh-14rem)]">
                  {tab === "preview" ? (
                    kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.url} alt={file.name} className="mx-auto max-h-[60vh] max-w-full object-contain" />
                    ) : textual ? (
                      <TextBody content={content} markdown={kind === "markdown"} />
                    ) : (
                      <p className="py-16 text-center text-sm text-muted-foreground">미리보기를 지원하지 않는 파일 형식입니다. 위의 ‘원본 다운로드’나 ‘새 탭’을 이용하세요.</p>
                    )
                  ) : textual ? (
                    <TextBody content={content} markdown={false} />
                  ) : (
                    <p className="py-16 text-center text-sm text-muted-foreground">이 파일 형식은 텍스트 보기 대상이 아닙니다.</p>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <FileChatMock fileName={file.name} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TextBody({ content, markdown }: { content: TextState; markdown: boolean }) {
  if (content.status === "loading") {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        불러오는 중…
      </p>
    )
  }
  if (content.status === "error") return <p className="py-16 text-center text-sm text-destructive">파일 내용을 불러오지 못했습니다.</p>
  return (
    <>
      {markdown ? <Markdown content={content.text} /> : <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{content.text}</pre>}
      {content.truncated ? <p className="mt-3 text-xs text-muted-foreground">일부만 표시됩니다. 전체 내용은 원본을 확인하세요.</p> : null}
    </>
  )
}

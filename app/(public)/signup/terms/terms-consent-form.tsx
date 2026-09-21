"use client"

import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { Check, CircleDashed, FileText, ShieldCheck } from "lucide-react"
import { acceptTerms, declineTerms } from "@/app/(public)/signup/terms/actions"
import { useI18n } from "@/components/i18n/i18n-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatBoardDateTime } from "@/lib/i18n/format"
import { showAlert, showConfirm } from "@/lib/ui/layer-dialog"
import { cn } from "@/lib/utils"
import type { TermsSlug } from "@/types/terms"

export type ConsentDocumentView = {
  slug: TermsSlug
  title: string
  version: number
  updatedAt: string | null
  /** 영문 본문이 없어 한국어로 대체했을 때 보여 줄 안내. 없으면 null */
  fallbackNotice: string | null
  /** 서버에서 sanitize 해 렌더한 본문. 클라이언트로 sanitize 라이브러리를 내리지 않기 위해 노드로 받는다. */
  body: ReactNode
}

export function TermsConsentForm({
  documents,
  email,
  fresh,
}: {
  documents: ConsentDocumentView[]
  email: string | null
  /** 방금 만들어진 계정이면 "동의하지 않음"이 가입 취소(계정 삭제)로 동작한다. */
  fresh: boolean
}) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({})
  const [pending, setPending] = useState<"accept" | "decline" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const allConfirmed = documents.every((doc) => confirmed[doc.slug])
  const confirmedCount = documents.filter((doc) => confirmed[doc.slug]).length

  function toggle(slug: TermsSlug) {
    setError(null)
    setConfirmed((current) => ({ ...current, [slug]: !current[slug] }))
  }

  async function onSubmit(formData: FormData) {
    if (!allConfirmed) {
      setError(t("terms.consent.error.notConfirmed"))
      return
    }
    setPending("accept")
    setError(null)
    const result = await acceptTerms(formData)
    if (!result.ok) {
      setPending(null)
      const message =
        result.error === "not_confirmed"
          ? t("terms.consent.error.notConfirmed")
          : result.error === "not_configured"
            ? t("auth.missingEnv")
            : t("terms.consent.error.failed")
      setError(result.detail ? `${message} (${result.detail})` : message)
      return
    }
    await showAlert(t("terms.consent.done"), { title: t("terms.consent.doneTitle") })
    router.replace(result.next)
    router.refresh()
  }

  async function onDecline() {
    const ok = await showConfirm(
      fresh ? t("terms.consent.declineConfirmFresh") : t("terms.consent.declineConfirm"),
      {
        title: t("terms.consent.decline"),
        destructive: true,
        confirmLabel: fresh ? t("terms.consent.declineFresh") : t("common.logout"),
      }
    )
    if (!ok) return
    setPending("decline")
    setError(null)
    const result = await declineTerms()
    if (!result.ok) {
      setPending(null)
      setError(`${t("terms.consent.error.declineFailed")} (${result.error})`)
      return
    }
    router.replace(result.next)
    router.refresh()
  }

  return (
    <form action={onSubmit} className="mt-8 space-y-6">
      <ol className="grid gap-2 sm:grid-cols-3" aria-label={t("terms.consent.progress")}>
        {documents.map((doc, index) => (
          <StepChip
            key={doc.slug}
            index={index + 1}
            label={doc.title}
            state={confirmed[doc.slug] ? "done" : "todo"}
          />
        ))}
        <StepChip
          index={documents.length + 1}
          label={t("terms.consent.finishStep")}
          state={allConfirmed ? "ready" : "todo"}
        />
      </ol>

      {email ? (
        <p className="text-sm text-muted-foreground">
          {t("terms.consent.signingUpAs", { email })}
        </p>
      ) : null}

      {documents.map((doc, index) => {
        const done = Boolean(confirmed[doc.slug])
        const bodyId = `terms-body-${doc.slug}`
        return (
          <section
            key={doc.slug}
            aria-labelledby={`terms-title-${doc.slug}`}
            className={cn(
              "overflow-hidden rounded-2xl border bg-card transition-colors",
              done ? "border-emerald-500/40" : "border-foreground/10"
            )}
          >
            <header className="flex flex-wrap items-start justify-between gap-3 border-b px-6 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("terms.consent.step", { index: index + 1 })}
                </p>
                <h2 id={`terms-title-${doc.slug}`} className="mt-1 font-display text-xl font-bold">
                  {doc.title}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {doc.version > 0 ? `v${doc.version}` : t("common.none")}
                  {doc.updatedAt ? ` · ${formatBoardDateTime(doc.updatedAt, locale)}` : ""}
                </p>
              </div>
              <Badge variant={done ? "default" : "secondary"} className="shrink-0 gap-1">
                {done ? <Check className="size-3" /> : <CircleDashed className="size-3" />}
                {done ? t("terms.consent.confirmed") : t("terms.consent.pending")}
              </Badge>
            </header>

            {doc.fallbackNotice ? (
              <p className="border-b bg-amber-500/10 px-6 py-2 text-xs text-amber-800 dark:text-amber-300">
                {doc.fallbackNotice}
              </p>
            ) : null}
            <div
              id={bodyId}
              tabIndex={0}
              className="max-h-[22rem] overflow-y-auto px-6 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {doc.body}
            </div>

            <footer className="flex flex-col gap-3 border-t bg-muted/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">{t("terms.consent.readHint")}</p>
              {done ? <input type="hidden" name={`confirm_${doc.slug}`} value="on" /> : null}
              <Button
                type="button"
                variant={done ? "secondary" : "default"}
                aria-pressed={done}
                aria-controls={bodyId}
                disabled={pending !== null}
                onClick={() => toggle(doc.slug)}
                className="rounded-full"
              >
                {done ? <Check /> : <FileText />}
                {done ? t("terms.consent.confirmedButton") : t("terms.consent.confirmButton")}
              </Button>
            </footer>
          </section>
        )
      })}

      {error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          disabled={pending !== null}
          onClick={onDecline}
          className="text-muted-foreground"
        >
          {pending === "decline"
            ? t("common.loading")
            : fresh
              ? t("terms.consent.declineFresh")
              : t("terms.consent.decline")}
        </Button>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Button
            type="submit"
            size="lg"
            disabled={!allConfirmed || pending !== null}
            className="rounded-full px-8"
          >
            <ShieldCheck />
            {pending === "accept" ? t("common.loading") : t("terms.consent.accept")}
          </Button>
          <p className="text-xs text-muted-foreground sm:text-right">
            {t("terms.consent.remaining", { done: confirmedCount, total: documents.length })}
          </p>
        </div>
      </div>
    </form>
  )
}

function StepChip({
  index,
  label,
  state,
}: {
  index: number
  label: string
  state: "todo" | "done" | "ready"
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
        state === "done" && "border-emerald-500/40 bg-emerald-500/[0.06]",
        state === "ready" && "border-foreground/30 bg-foreground/[0.03]",
        state === "todo" && "border-foreground/10 text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          state === "done"
            ? "bg-emerald-600 text-white"
            : state === "ready"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground"
        )}
        aria-hidden
      >
        {state === "done" ? <Check className="size-3.5" /> : index}
      </span>
      <span className="min-w-0 truncate font-medium">{label}</span>
    </li>
  )
}

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  Check,
  Copy,
  Dices,
  Globe2,
  Link2,
  Mail,
  MessageSquareText,
  Send,
  Share2,
  Trash2,
  UserRoundCheck,
  X,
} from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { showAlert, showConfirm } from "@/components/ui/layer-dialog"
import { Switch } from "@/components/ui/switch"
import { lockDocumentScroll } from "@/lib/dom/lock-scroll"
import {
  loadShareState,
  removeShareInvite,
  saveInviteShare,
  savePublicShare,
  stopSharing,
} from "@/lib/share/actions"
import { cn } from "@/lib/utils"
import type { InviteMethod, ShareActionResult, ShareInviteView, ShareState, ShareTargetType } from "@/types/share"

type Mode = "none" | "public" | "invite"

const METHODS: InviteMethod[] = ["COPY", "EMAIL", "SMS"]

const controlClass =
  "flex h-9 w-full rounded-md border border-input bg-field px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

/** datetime-local 입력값(yyyy-MM-ddTHH:mm, 브라우저 로컬 시간) ↔ ISO */
function toLocalInput(iso: string | null) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInput(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function randomPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const values = new Uint32Array(8)
  crypto.getRandomValues(values)
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("")
}

function shareUrl(key: string) {
  return `${window.location.origin}/share/${key}`
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function ShareDialog({
  targetType,
  targetId,
  onClose,
}: {
  targetType: ShareTargetType
  targetId: string
  onClose: () => void
}) {
  const { t } = useI18n()
  const [state, setState] = useState<ShareState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>("none")
  const [pending, setPending] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  // 링크를 보유한 누구나
  const [periodOn, setPeriodOn] = useState(false)
  const [expires, setExpires] = useState("")
  const [passwordOn, setPasswordOn] = useState(false)
  const [password, setPassword] = useState("")
  const [visitsOn, setVisitsOn] = useState(false)
  const [maxVisits, setMaxVisits] = useState("")

  // 초대 받은 사람만
  const [invPeriodOn, setInvPeriodOn] = useState(false)
  const [invExpires, setInvExpires] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>("COPY")
  const [inviteEmail, setInviteEmail] = useState("")
  const [invitePhone, setInvitePhone] = useState("")
  const [inviteTitle, setInviteTitle] = useState("")
  const [inviteMessage, setInviteMessage] = useState("")

  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const errorText = useCallback(
    (code: string) => {
      const key = `share.error.${code}`
      const text = t(key)
      return text === key ? t("share.error.failed") : text
    },
    [t]
  )

  // 서버 상태를 화면 입력값에 반영한다.
  const applyState = useCallback((next: ShareState) => {
    setState(next)
    setMode(next.mode)
    const pub = next.publicLink
    setPeriodOn(pub?.periodLimited ?? false)
    setExpires(toLocalInput(pub?.expiresAt ?? null))
    setPasswordOn(pub?.hasPassword ?? false)
    setPassword("")
    setVisitsOn(pub?.visitLimited ?? false)
    setMaxVisits(pub?.maxVisits ? String(pub.maxVisits) : "")
    const inv = next.invite
    setInvPeriodOn(inv?.periodLimited ?? false)
    setInvExpires(toLocalInput(inv?.expiresAt ?? null))
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadShareState(targetType, targetId).then((result) => {
      if (cancelled) return
      if (result.ok) applyState(result.state)
      else setLoadError(errorText(result.error))
    })
    return () => {
      cancelled = true
    }
    // 처음 열릴 때만 불러온다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetId])

  useEffect(() => {
    const unlock = lockDocumentScroll()
    closeRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      unlock()
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  function flashCopied(id: string) {
    setCopiedKey(id)
    window.setTimeout(() => setCopiedKey((current) => (current === id ? null : current)), 1600)
  }

  async function copy(id: string, text: string) {
    if (await copyText(text)) flashCopied(id)
    else await showAlert(t("share.copyFailed"))
  }

  // React 18의 startTransition은 async 작업이 끝날 때까지 pending을 유지하지 못하므로 직접 관리한다.
  async function run(
    action: () => Promise<ShareActionResult>,
    after?: (result: Extract<ShareActionResult, { ok: true }>) => void | Promise<void>
  ) {
    if (pending) return
    setPending(true)
    try {
      const result = await action()
      if (!result.ok) {
        await showAlert(errorText(result.error))
        return
      }
      applyState(result.state)
      await after?.(result)
    } finally {
      setPending(false)
    }
  }

  // ---- 공유 방식 전환 ----
  async function chooseMode(next: Mode) {
    if (next === mode || pending || !state) return
    // 이미 저장된 다른 방식의 공유 정보가 있으면 지운다는 안내를 먼저 한다.
    if (state.mode !== "none" && next !== state.mode) {
      const ok = await showConfirm(next === "none" ? t("share.confirm.stop") : t("share.confirm.change"), {
        destructive: true,
      })
      if (!ok) return
      await run(() => stopSharing(targetType, targetId), () => setMode(next))
      return
    }
    setMode(next)
  }

  // ---- 링크를 보유한 누구나 ----
  function savePublic() {
    const expiresAt = fromLocalInput(expires)
    if (periodOn && !expiresAt) return void showAlert(errorText("expiryRequired"))
    if (visitsOn && !(Number(maxVisits) >= 1)) return void showAlert(errorText("maxVisitsInvalid"))
    if (passwordOn && !password && !state?.publicLink?.hasPassword) return void showAlert(errorText("passwordRequired"))

    // undefined: 기존 비밀번호 유지 / null: 해제 / 문자열: 새 비밀번호
    const passwordValue = !passwordOn ? null : password ? password : undefined

    const existed = Boolean(state?.publicLink)
    run(
      () =>
        savePublicShare(targetType, targetId, {
          periodLimited: periodOn,
          expiresAt,
          password: passwordValue,
          visitLimited: visitsOn,
          maxVisits: visitsOn ? Number(maxVisits) : null,
        }),
      () => showAlert(existed ? t("share.saved.update") : t("share.saved.create"))
    )
  }

  const publicUrl = state?.publicLink ? shareUrl(state.publicLink.key) : ""

  function sendMail(title: string, body: string) {
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
  }

  async function nativeShare() {
    if (!publicUrl || !state) return
    try {
      await navigator.share({ title: state.target.title, url: publicUrl })
    } catch {
      // 사용자가 공유 시트를 닫은 경우 — 조용히 넘어간다
    }
  }
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function"

  // ---- 초대 받은 사람만 ----
  const defaultTitle = state ? t("share.invite.defaultTitle", { title: state.target.title }) : ""
  const defaultMessage = state ? t("share.invite.defaultMessage", { title: state.target.title }) : ""

  function inviteBody(invite: { message: string | null; name: string }, url: string) {
    const message = invite.message || t("share.invite.defaultMessage", { title: state?.target.title ?? "" })
    return `${message}\n\n${t("share.invite.linkLabel")} ${url}`
  }

  function deliver(invite: Pick<ShareInviteView, "method" | "email" | "phone" | "title" | "message" | "name">, url: string) {
    const title = invite.title || defaultTitle
    const body = inviteBody(invite, url)
    if (invite.method === "EMAIL") {
      window.location.href = `mailto:${encodeURIComponent(invite.email ?? "")}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
    } else if (invite.method === "SMS") {
      window.location.href = `sms:${invite.phone ?? ""}?body=${encodeURIComponent(body)}`
    }
  }

  function saveInvitePeriodOnly() {
    const expiresAt = fromLocalInput(invExpires)
    if (invPeriodOn && !expiresAt) return void showAlert(errorText("expiryRequired"))
    run(() => saveInviteShare(targetType, targetId, { periodLimited: invPeriodOn, expiresAt, invite: null }), () =>
      showAlert(t("share.saved.update"))
    )
  }

  function createInvite() {
    const expiresAt = fromLocalInput(invExpires)
    if (invPeriodOn && !expiresAt) return void showAlert(errorText("expiryRequired"))
    if (!inviteName.trim()) return void showAlert(errorText("inviteNameInvalid"))

    const payload = {
      name: inviteName,
      method: inviteMethod,
      email: inviteMethod === "EMAIL" ? inviteEmail : null,
      phone: inviteMethod === "SMS" ? invitePhone : null,
      title: inviteTitle.trim() || null,
      message: inviteMessage.trim() || null,
    }

    run(
      () => saveInviteShare(targetType, targetId, { periodLimited: invPeriodOn, expiresAt, invite: payload }),
      async (result) => {
        const key = result.created?.key
        if (!key) return
        const url = shareUrl(key)
        setInviteName("")
        setInviteEmail("")
        setInvitePhone("")
        setInviteTitle("")
        setInviteMessage("")
        if (payload.method === "COPY") {
          await copy(`invite-${key}`, url)
          await showAlert(t("share.invite.createdCopied"))
        } else {
          deliver({ ...payload, title: payload.title, message: payload.message }, url)
        }
      }
    )
  }

  async function removeInviteRow(invite: ShareInviteView) {
    if (!(await showConfirm(t("share.invite.deleteConfirm", { name: invite.name }), { destructive: true }))) return
    await run(() => removeShareInvite(targetType, targetId, invite.id))
  }

  const invites = useMemo(() => state?.invite?.invites ?? [], [state])
  const readCount = useMemo(() => invites.filter((invite) => invite.readAt).length, [invites])

  const modeCards: { id: Mode; icon: typeof Share2; title: string; desc: string[] }[] = [
    { id: "none", icon: X, title: t("share.mode.none"), desc: [] },
    { id: "public", icon: Globe2, title: t("share.mode.public"), desc: [t("share.mode.publicDesc")] },
    { id: "invite", icon: UserRoundCheck, title: t("share.mode.invite"), desc: [t("share.mode.inviteDesc1"), t("share.mode.inviteDesc2")] },
  ]

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("share.title")}
        className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border bg-background shadow-[0_30px_80px_-30px_hsl(24_20%_10%/0.6)] animate-in fade-in slide-in-from-bottom-6 duration-300 sm:rounded-3xl"
      >
        <header className="relative border-b px-6 pb-4 pt-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,hsl(var(--lux-champagne)/0.3),transparent_55%)]"
          />
          <div className="relative flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
              <Share2 className="size-5 text-[hsl(var(--lux-cognac))]" aria-hidden />
              {t("share.title")}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t("share.close")}
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          {state ? (
            <div className="relative mt-4 rounded-xl border bg-card/80 px-4 py-3">
              <p className="truncate text-sm font-bold">{state.target.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{state.target.subPath}</p>
            </div>
          ) : null}
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {loadError ? (
            <p className="py-10 text-center text-sm text-destructive">{loadError}</p>
          ) : !state ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("share.loading")}</p>
          ) : (
            <>
              <section aria-label={t("share.mode.title")}>
                <h3 className="text-sm font-bold">{t("share.mode.title")}</h3>
                <div className="mt-2.5 grid gap-2">
                  {modeCards.map((card) => {
                    const active = mode === card.id
                    const Icon = card.icon
                    return (
                      <button
                        key={card.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={pending}
                        onClick={() => void chooseMode(card.id)}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors disabled:opacity-60",
                          active
                            ? "border-[hsl(var(--lux-cognac)/0.6)] bg-[hsl(var(--lux-champagne)/0.16)] ring-1 ring-[hsl(var(--lux-cognac)/0.3)]"
                            : "hover:bg-foreground/[0.03]"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                            active ? "bg-[hsl(var(--lux-cognac))] text-white" : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{card.title}</span>
                          {card.desc.map((line) => (
                            <span key={line} className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                              {line}
                            </span>
                          ))}
                        </span>
                        {active ? <Check className="mt-1 size-4 shrink-0 text-[hsl(var(--lux-cognac))]" aria-hidden /> : null}
                      </button>
                    )
                  })}
                </div>
              </section>

              {mode === "public" ? (
                <section className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold">{t("share.public.title")}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("share.public.desc")}</p>
                  </div>

                  <OptionRow
                    title={t("share.period.title")}
                    desc={t("share.period.desc")}
                    checked={periodOn}
                    onChange={setPeriodOn}
                  >
                    <input
                      type="datetime-local"
                      value={expires}
                      onChange={(event) => setExpires(event.target.value)}
                      className={controlClass}
                      aria-label={t("share.period.title")}
                    />
                  </OptionRow>

                  <OptionRow title={t("share.password.title")} checked={passwordOn} onChange={setPasswordOn}>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        autoComplete="off"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={
                          state.publicLink?.hasPassword ? t("share.password.keepPlaceholder") : t("share.password.placeholder")
                        }
                        aria-label={t("share.password.title")}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => setPassword(randomPassword())}
                        title={t("share.password.generate")}
                        aria-label={t("share.password.generate")}
                      >
                        <Dices />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        disabled={!password}
                        onClick={() => void copy("password", password)}
                        title={t("share.password.copy")}
                        aria-label={t("share.password.copy")}
                      >
                        {copiedKey === "password" ? <Check /> : <Copy />}
                      </Button>
                    </div>
                  </OptionRow>

                  <OptionRow
                    title={t("share.visits.title")}
                    desc={t("share.visits.desc")}
                    checked={visitsOn}
                    onChange={setVisitsOn}
                  >
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={maxVisits}
                      onChange={(event) => setMaxVisits(event.target.value)}
                      placeholder={t("share.visits.placeholder")}
                      aria-label={t("share.visits.label")}
                    />
                  </OptionRow>

                  <Button type="button" className="w-full" disabled={pending} onClick={savePublic}>
                    {state.publicLink ? t("share.update") : t("share.create")}
                  </Button>

                  {state.publicLink ? (
                    <div className="space-y-3 rounded-2xl border bg-card p-4">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/80">
                          <Link2 className="size-3.5" aria-hidden />
                          {t("share.link.label")}
                        </span>
                        <span className="tabular-nums">
                          {t("share.visits.total", { count: state.publicLink.visitCount })}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Input readOnly value={publicUrl} onFocus={(event) => event.currentTarget.select()} aria-label={t("share.link.label")} />
                        <Button type="button" variant="outline" className="shrink-0" onClick={() => void copy("public", publicUrl)}>
                          {copiedKey === "public" ? <Check /> : <Copy />}
                          {copiedKey === "public" ? t("share.copied") : t("share.link.copy")}
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            sendMail(
                              t("share.mail.subject", { title: state.target.title }),
                              `${t("share.mail.body")}\n${publicUrl}`
                            )
                          }
                        >
                          <Mail />
                          {t("share.link.mail")}
                        </Button>
                        {canNativeShare ? (
                          <Button type="button" variant="outline" onClick={() => void nativeShare()}>
                            <Send />
                            {t("share.link.native")}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {mode === "invite" ? (
                <section className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold">{t("share.invite.title")}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("share.invite.desc")}</p>
                  </div>

                  <OptionRow
                    title={t("share.period.title")}
                    desc={t("share.invite.periodDesc")}
                    checked={invPeriodOn}
                    onChange={setInvPeriodOn}
                  >
                    <div className="flex gap-2">
                      <input
                        type="datetime-local"
                        value={invExpires}
                        onChange={(event) => setInvExpires(event.target.value)}
                        className={controlClass}
                        aria-label={t("share.period.title")}
                      />
                      {state.invite ? (
                        <Button type="button" variant="outline" className="shrink-0" disabled={pending} onClick={saveInvitePeriodOnly}>
                          {t("share.invite.periodSave")}
                        </Button>
                      ) : null}
                    </div>
                  </OptionRow>

                  <div className="space-y-4 rounded-2xl border bg-card p-4">
                    <div>
                      <h4 className="text-sm font-bold">{t("share.invite.form.title")}</h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">{t("share.invite.form.desc")}</p>
                    </div>

                    <Field label={t("share.invite.name.label")} hint={t("share.invite.name.desc")}>
                      <Input
                        value={inviteName}
                        maxLength={40}
                        onChange={(event) => setInviteName(event.target.value)}
                        placeholder={t("share.invite.name.placeholder")}
                      />
                    </Field>

                    <Field label={t("share.invite.method.label")} hint={t("share.invite.method.desc")}>
                      <select
                        value={inviteMethod}
                        onChange={(event) => setInviteMethod(event.target.value as InviteMethod)}
                        className={controlClass}
                      >
                        {METHODS.map((method) => (
                          <option key={method} value={method}>
                            {t(`share.invite.method.${method}`)}
                          </option>
                        ))}
                      </select>
                      {inviteMethod === "EMAIL" ? (
                        <Input
                          type="email"
                          className="mt-2"
                          value={inviteEmail}
                          onChange={(event) => setInviteEmail(event.target.value)}
                          placeholder={t("share.invite.email.placeholder")}
                        />
                      ) : null}
                      {inviteMethod === "SMS" ? (
                        <Input
                          type="tel"
                          className="mt-2"
                          value={invitePhone}
                          onChange={(event) => setInvitePhone(event.target.value)}
                          placeholder={t("share.invite.phone.placeholder")}
                        />
                      ) : null}
                      <p className="mt-1.5 text-xs text-muted-foreground">{t(`share.invite.methodHint.${inviteMethod}`)}</p>
                    </Field>

                    {inviteMethod !== "COPY" ? (
                      <Field label={t("share.invite.content.label")} hint={t("share.invite.content.desc")}>
                        <Input
                          value={inviteTitle}
                          maxLength={100}
                          onChange={(event) => setInviteTitle(event.target.value)}
                          placeholder={defaultTitle || t("share.invite.content.title.placeholder")}
                        />
                        <textarea
                          value={inviteMessage}
                          maxLength={1000}
                          rows={3}
                          onChange={(event) => setInviteMessage(event.target.value)}
                          placeholder={defaultMessage || t("share.invite.content.message.placeholder")}
                          className={cn(controlClass, "mt-2 h-auto min-h-20 resize-y py-2")}
                        />
                      </Field>
                    ) : null}

                    <Button type="button" className="w-full" disabled={pending} onClick={createInvite}>
                      {t(`share.invite.btn.${inviteMethod}`)}
                    </Button>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="text-sm font-bold">
                        {t("share.invite.list.title", { count: invites.length })}
                      </h4>
                      {invites.length > 0 ? (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {t("share.invite.list.summary", { read: readCount, unread: invites.length - readCount })}
                        </span>
                      ) : null}
                    </div>
                    {invites.length === 0 ? (
                      <p className="mt-3 rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                        {t("share.invite.list.empty")}
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {invites.map((invite) => {
                          const url = shareUrl(invite.key)
                          return (
                            <li key={invite.id} className="rounded-xl border bg-card px-3.5 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                                    <span className="truncate">{invite.name}</span>
                                    <span
                                      className={cn(
                                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                        invite.readAt
                                          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                                          : "bg-muted text-muted-foreground"
                                      )}
                                    >
                                      {invite.readAt ? t("share.invite.read") : t("share.invite.unread")}
                                    </span>
                                  </p>
                                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {t(`share.invite.method.${invite.method}`)}
                                    {invite.email ? ` · ${invite.email}` : invite.phone ? ` · ${invite.phone}` : ""}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  {invite.method !== "COPY" ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deliver(invite, url)}
                                      title={t("share.invite.resend")}
                                      aria-label={t("share.invite.resend")}
                                    >
                                      {invite.method === "EMAIL" ? <Mail /> : <MessageSquareText />}
                                    </Button>
                                  ) : null}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => void copy(`invite-${invite.key}`, url)}
                                    title={t("share.invite.copy")}
                                    aria-label={t("share.invite.copy")}
                                  >
                                    {copiedKey === `invite-${invite.key}` ? <Check /> : <Copy />}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => void removeInviteRow(invite)}
                                    title={t("share.invite.delete")}
                                    aria-label={t("share.invite.delete")}
                                  >
                                    <Trash2 />
                                  </Button>
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </section>
              ) : null}

              {mode === "none" ? (
                <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  {t("share.mode.noneHint")}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function OptionRow({
  title,
  desc,
  checked,
  onChange,
  children,
}: {
  title: string
  desc?: string
  checked: boolean
  onChange: (checked: boolean) => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {desc ? <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p> : null}
        </div>
        <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
      </div>
      {checked ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      {hint ? <p className="mb-2 mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p> : <div className="mb-2" />}
      {children}
    </div>
  )
}

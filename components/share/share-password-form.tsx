"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LockKeyhole } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { verifySharePasswordAction } from "@/lib/share/actions"

export function SharePasswordForm({ shareKey }: { shareKey: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!password || pending) return
    setError(null)
    setPending(true)
    try {
      const result = await verifySharePasswordAction(shareKey, password)
      if (result.ok) {
        router.refresh()
        return
      }
      setError(t(`share.view.password.error.${result.error}`))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md py-12">
      <form
        onSubmit={submit}
        className="space-y-5 rounded-2xl border bg-card p-7 shadow-[0_24px_60px_-36px_hsl(24_20%_10%/0.55)]"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-[hsl(var(--lux-champagne)/0.28)] text-[hsl(var(--lux-cognac))]">
          <LockKeyhole className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{t("share.view.password.title")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("share.view.password.subtitle")}</p>
        </div>
        <div className="space-y-2">
          <Input
            type="password"
            autoFocus
            autoComplete="off"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t("share.view.password.placeholder")}
            aria-invalid={error ? true : undefined}
            aria-label={t("share.view.password.label")}
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={pending || !password}>
          {t("share.view.password.submit")}
        </Button>
      </form>
    </div>
  )
}

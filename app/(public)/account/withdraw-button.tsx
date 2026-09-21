"use client"

import { useState } from "react"
import { withdrawAccount } from "@/app/(public)/account/actions"
import { useI18n } from "@/components/i18n/i18n-provider"
import { Button } from "@/components/ui/button"
import { showConfirm } from "@/lib/ui/layer-dialog"

export function WithdrawButton() {
  const { t } = useI18n()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onWithdraw() {
    const ok = await showConfirm(t("account.withdrawConfirm"), { destructive: true, title: t("account.withdraw") })
    if (!ok) return
    setPending(true)
    setError(null)
    const result = await withdrawAccount()
    if (!result) return
    if (result.error === "owner") {
      setError(t("account.withdrawOwner"))
    } else {
      setError(t("account.withdrawError"))
    }
    setPending(false)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("account.withdrawHint")}</p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" variant="destructive" disabled={pending} onClick={onWithdraw}>
        {pending ? t("common.loading") : t("account.withdraw")}
      </Button>
    </div>
  )
}

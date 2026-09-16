"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/i18n/i18n-provider"

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [done, setDone] = useState(false)
  const { t } = useI18n()

  async function copy() {
    await navigator.clipboard.writeText(text)
    setDone(true)
    window.setTimeout(() => setDone(false), 1500)
  }

  return (
    <Button type="button" variant="outline" className={className} onClick={copy}>
      {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {done ? t("common.copied") : t("common.copy")}
    </Button>
  )
}

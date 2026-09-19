"use client"

import { useI18n } from "@/components/i18n/i18n-provider"

export function I18nDemo() {
  const { locale, t } = useI18n()
  const rows: [string, string][] = [
    ["locale", locale],
    [`t("common.search")`, t("common.search")],
    [`t("common.prev")`, t("common.prev")],
    [`t("common.pageRange", { from: 1, to: 10, count: 42 })`, t("common.pageRange", { from: 1, to: 10, count: 42 })],
  ]
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
      {rows.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="font-mono text-xs text-muted-foreground">{key}</dt>
          <dd className="font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

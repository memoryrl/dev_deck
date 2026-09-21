"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { saveTerms } from "@/app/(dashboard)/site/terms/actions"
import { RichEditor } from "@/components/editor/rich-editor"
import { useI18n } from "@/components/i18n/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatBoardDateTime } from "@/lib/i18n/format"
import { showAlert } from "@/lib/ui/layer-dialog"
import type { TermsDocument } from "@/types/terms"

export function TermsEditorForm({ document }: { document: TermsDocument }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(formData: FormData) {
    formData.set("slug", document.slug)
    setPending(true)
    setError(null)
    const result = await saveTerms(formData)
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      await showAlert(result.error)
      return
    }
    router.refresh()
    await showAlert(t("admin.terms.saved", { version: result.version }))
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <section className="rounded-xl border bg-white p-6 dark:bg-card">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">{t(`terms.doc.${document.slug}`)}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {document.version > 0
                ? t("admin.terms.currentVersion", {
                    version: document.version,
                    date: formatBoardDateTime(document.updated_at, locale),
                  })
                : t("admin.terms.notRegistered")}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`terms-title-${document.slug}`}>{t("common.title")}</Label>
            <Input
              id={`terms-title-${document.slug}`}
              name="title"
              required
              maxLength={120}
              defaultValue={document.title}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin.terms.body")}</Label>
            <RichEditor
              key={`${document.slug}-${document.version}`}
              name="content"
              defaultValue={document.content}
              placeholder={t("admin.terms.bodyPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("admin.terms.bodyHint")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`terms-note-${document.slug}`}>{t("admin.terms.note")}</Label>
            <Input
              id={`terms-note-${document.slug}`}
              name="note"
              maxLength={300}
              placeholder={t("admin.terms.notePlaceholder")}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">{t("admin.terms.noteHint")}</p>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" className="rounded-full px-8" disabled={pending}>
          {pending ? t("common.loading") : t("admin.terms.save")}
        </Button>
      </div>
    </form>
  )
}

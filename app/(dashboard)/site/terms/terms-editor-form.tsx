"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { saveTerms } from "@/app/(dashboard)/site/terms/actions"
import { RichEditor } from "@/components/editor/rich-editor"
import { useI18n } from "@/components/i18n/i18n-provider"
import { Badge } from "@/components/ui/badge"
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
  const hasEn = Boolean(document.content_en.trim())

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

  const editorKey = `${document.slug}-${document.version}`

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="rounded-xl border bg-white px-6 py-4 dark:bg-card">
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

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="min-w-0 rounded-xl border bg-white p-6 dark:bg-card">
          <div className="mb-6 flex items-center gap-2">
            <h3 className="font-display text-base font-bold">{t("admin.terms.lang.ko")}</h3>
            <Badge>{t("admin.terms.lang.required")}</Badge>
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
                key={`${editorKey}-ko`}
                name="content"
                defaultValue={document.content}
                placeholder={t("admin.terms.bodyPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("admin.terms.bodyHint")}</p>
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-xl border bg-white p-6 dark:bg-card">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-bold">{t("admin.terms.lang.en")}</h3>
            <Badge variant="secondary">{t("admin.terms.lang.optional")}</Badge>
            {!hasEn ? (
              <span className="text-xs text-muted-foreground">{t("admin.terms.lang.enMissing")}</span>
            ) : null}
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`terms-title-en-${document.slug}`}>{t("admin.terms.lang.titleEn")}</Label>
              <Input
                id={`terms-title-en-${document.slug}`}
                name="title_en"
                maxLength={120}
                defaultValue={document.title_en}
                placeholder={document.slug === "terms" ? "Terms of Service" : "Privacy Policy"}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.terms.lang.bodyEn")}</Label>
              <RichEditor
                key={`${editorKey}-en`}
                name="content_en"
                defaultValue={document.content_en}
                placeholder={t("admin.terms.lang.bodyEnPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("admin.terms.lang.enHint")}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-xl border bg-white p-6 dark:bg-card">
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

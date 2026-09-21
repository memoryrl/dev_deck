"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { saveSiteSettings } from "@/app/(dashboard)/site/settings/actions"
import { useI18n } from "@/components/i18n/i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { showAlert } from "@/lib/ui/layer-dialog"
import type { SiteSettings } from "@/lib/site/settings"

export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const { t } = useI18n()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode)

  async function onSubmit(formData: FormData) {
    if (maintenanceMode) formData.set("maintenanceMode", "on")
    else formData.delete("maintenanceMode")
    setPending(true)
    setError(null)
    const result = await saveSiteSettings(formData)
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      await showAlert(result.error)
      return
    }
    router.refresh()
    await showAlert(t("admin.settings.saved"))
  }

  return (
    <form action={onSubmit} className="space-y-8">
      <section className="rounded-xl border bg-white p-6 dark:bg-card">
        <h2 className="mb-6 font-display text-lg font-bold">{t("admin.settings.basicInfo")}</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteName">{t("admin.settings.siteName")}</Label>
            <Input
              id="siteName"
              name="siteName"
              defaultValue={settings.siteName}
              placeholder="DevDeck"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="siteDescription">{t("admin.settings.siteDescription")}</Label>
            <Textarea
              id="siteDescription"
              name="siteDescription"
              defaultValue={settings.siteDescription}
              placeholder={t("admin.settings.siteDescription")}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {t("admin.settings.siteDescriptionHint")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerText">{t("admin.settings.footerText")}</Label>
            <Input
              id="footerText"
              name="footerText"
              defaultValue={settings.footerText}
              placeholder="© 2024 DevDeck"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 dark:bg-card">
        <h2 className="mb-6 font-display text-lg font-bold">{t("admin.settings.seo")}</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteKeywords">{t("admin.settings.keywords")}</Label>
            <Input
              id="siteKeywords"
              name="siteKeywords"
              defaultValue={settings.siteKeywords}
              placeholder="AI, 프롬프트, 포트폴리오"
            />
            <p className="text-xs text-muted-foreground">
              {t("admin.settings.keywordsHint")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="socialImage">{t("admin.settings.socialImage")}</Label>
            <Input
              id="socialImage"
              name="socialImage"
              defaultValue={settings.socialImage}
              placeholder="https://example.com/og-image.png"
            />
            <p className="text-xs text-muted-foreground">
              {t("admin.settings.socialImageHint")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="googleAnalyticsId">{t("admin.settings.googleAnalyticsId")}</Label>
            <Input
              id="googleAnalyticsId"
              name="googleAnalyticsId"
              defaultValue={settings.googleAnalyticsId}
              placeholder="G-XXXXXXXXXX"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              {t("admin.settings.googleAnalyticsIdHint")}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 dark:bg-card">
        <h2 className="mb-6 font-display text-lg font-bold">{t("admin.settings.advanced")}</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="maintenanceMode">{t("admin.settings.maintenanceMode")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("admin.settings.maintenanceModeHint")}
              </p>
            </div>
            <Switch
              id="maintenanceMode"
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
            />
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" className="rounded-full px-8" disabled={pending}>
          {t("admin.settings.saveSettings")}
        </Button>
      </div>
    </form>
  )
}

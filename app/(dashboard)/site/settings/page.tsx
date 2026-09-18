import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { requireOwner } from "@/lib/auth/owner"
import { getSiteSettings } from "@/lib/site/settings"
import { getT } from "@/lib/i18n/dictionary"
import { saveSiteSettings } from "./actions"

export default async function SiteSettingsPage() {
  await requireOwner()
  const settings = await getSiteSettings()
  const { t } = getT()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageTitleBanner
        title={t("admin.settings.title")}
        description={t("admin.settings.description")}
      />

      <form action={saveSiteSettings} className="space-y-8">
        {/* 기본 정보 */}
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

        {/* SEO 설정 */}
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
              />
            </div>
          </div>
        </section>

        {/* 고급 설정 */}
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
                name="maintenanceMode"
                defaultChecked={settings.maintenanceMode}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" className="rounded-full px-8">
            {t("admin.settings.saveSettings")}
          </Button>
        </div>
      </form>
    </div>
  )
}

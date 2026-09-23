import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { requireOwner } from "@/lib/auth/owner"
import { APP_ENV_KEYS, getAppEnv } from "@/lib/site/app-env"
import { getSiteSettings } from "@/lib/site/settings"
import { getT } from "@/lib/i18n/dictionary"
import { SiteSettingsForm } from "./settings-form"

export default async function SiteSettingsPage() {
  await requireOwner()
  const [settings, ollamaBaseUrl, { t }] = await Promise.all([
    getSiteSettings(),
    getAppEnv(APP_ENV_KEYS.ollamaBaseUrl),
    getT(),
  ])

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title={t("admin.settings.title")}
        description={t("admin.settings.description")}
      />
      <SiteSettingsForm settings={settings} ollamaBaseUrl={ollamaBaseUrl} />
    </div>
  )
}

import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { requireOwner } from "@/lib/auth/owner"
import { getSiteSettings } from "@/lib/site/settings"
import { getT } from "@/lib/i18n/dictionary"
import { SiteSettingsForm } from "./settings-form"

export default async function SiteSettingsPage() {
  await requireOwner()
  const settings = await getSiteSettings()
  const { t } = getT()

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title={t("admin.settings.title")}
        description={t("admin.settings.description")}
      />
      <SiteSettingsForm settings={settings} />
    </div>
  )
}

import type { Metadata } from "next"
import { OssBackButton } from "@/components/oss/back-button"
import { OssLicenseTable } from "@/components/oss/license-table"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { PublicContainer } from "@/components/layout/public-container"
import { BACKEND_PACKAGES, FRONTEND_PACKAGES, OSS_GENERATED_AT } from "@/lib/oss/packages"
import { getT } from "@/lib/i18n/dictionary"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT()
  return {
    title: `${t("oss.title")} · DevDeck`,
    description: t("oss.lede"),
  }
}

export default async function OpenSourcePage() {
  const { t } = await getT()
  const labels = {
    package: t("oss.package"),
    version: t("oss.version"),
    license: t("oss.license"),
  }

  return (
    <PublicContainer>
      <PageTitleBanner title={t("oss.title")} description={t("oss.lede")} />

      <div className="mt-8">
        <OssBackButton label={t("oss.goBack")} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
        <OssLicenseTable title={t("oss.frontend")} packages={FRONTEND_PACKAGES} labels={labels} />
        <OssLicenseTable title={t("oss.backend")} packages={BACKEND_PACKAGES} labels={labels} />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">{t("oss.asOf", { date: OSS_GENERATED_AT })}</p>

      <div className="mt-8">
        <OssBackButton label={t("oss.goBack")} />
      </div>
    </PublicContainer>
  )
}

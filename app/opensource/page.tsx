import type { Metadata } from "next"
import { Info } from "lucide-react"
import { OssBackButton } from "@/components/oss/back-button"
import { OssLicenseTable } from "@/components/oss/license-table"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { PublicContainer } from "@/components/layout/public-container"
import { BACKEND_PACKAGES, FRONTEND_PACKAGES } from "@/lib/oss/packages"
import { getT } from "@/lib/i18n/dictionary"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = getT()
  return {
    title: `${t("oss.title")} · DevDeck`,
    description: t("oss.lede"),
  }
}

export default function OpenSourcePage() {
  const { t } = getT()
  const labels = {
    package: t("oss.package"),
    version: t("oss.version"),
    license: t("oss.license"),
  }

  return (
    <PublicContainer>
      <PageTitleBanner title={t("oss.title")} />

      <div className="mt-8">
        <OssBackButton label={t("oss.goBack")} />
      </div>

      <p className="mt-6 flex items-start gap-2.5 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-[hsl(var(--lux-cognac))]" aria-hidden />
        <span>{t("oss.lede")}</span>
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
        <OssLicenseTable title={t("oss.frontend")} packages={FRONTEND_PACKAGES} labels={labels} />
        <OssLicenseTable title={t("oss.backend")} packages={BACKEND_PACKAGES} labels={labels} />
      </div>

      <div className="mt-8">
        <OssBackButton label={t("oss.goBack")} />
      </div>
    </PublicContainer>
  )
}

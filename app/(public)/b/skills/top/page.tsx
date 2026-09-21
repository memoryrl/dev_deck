import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { PublicContainer } from "@/components/layout/public-container"
import { PodiumPanel } from "@/components/podium/podium-panel"
import { getTopSkills } from "@/lib/career/top"
import { getT } from "@/lib/i18n/dictionary"
import type { PodiumEntry } from "@/lib/podium/types"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"

export default async function SkillsTopPage() {
  const { t } = getT()
  const entries = await getTopSkills().catch(() => [] as PodiumEntry[])

  return (
    <PublicContainer>
      <PageTitleBanner
        title={t("work.topTitle")}
        description={t("work.topDescription")}
        breadcrumb={[{ label: t("work.topTitle") }]}
      />

      {entries.length === 0 ? (
        <EmptyPlaceholder className="mt-8">{t("work.topEmpty")}</EmptyPlaceholder>
      ) : (
        <div className="mt-8 overflow-hidden rounded-3xl border border-foreground/10 shadow-[0_24px_60px_-36px_hsl(24_20%_10%/0.55)]">
          <PodiumPanel entries={entries} />
        </div>
      )}
    </PublicContainer>
  )
}

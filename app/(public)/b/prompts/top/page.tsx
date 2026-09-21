import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { PublicContainer } from "@/components/layout/public-container"
import { PodiumPanel } from "@/components/podium/podium-panel"
import { getTopPrompts } from "@/lib/prompts/top"
import { getT } from "@/lib/i18n/dictionary"
import type { PodiumEntry } from "@/lib/podium/types"
import { EmptyPlaceholder } from "@/components/landing/empty-placeholder"

export default async function PromptsTopPage() {
  const { t } = getT()
  const entries = await getTopPrompts().catch(() => [] as PodiumEntry[])

  return (
    <PublicContainer>
      <PageTitleBanner
        title={t("prompts.topTitle")}
        description={t("prompts.topDescription")}
        breadcrumb={[{ label: t("prompts.topTitle") }]}
      />

      {entries.length === 0 ? (
        <EmptyPlaceholder className="mt-8">{t("prompts.topEmpty")}</EmptyPlaceholder>
      ) : (
        <div className="mt-8 overflow-hidden rounded-3xl border border-foreground/10 shadow-[0_24px_60px_-36px_hsl(24_20%_10%/0.55)]">
          <PodiumPanel entries={entries} />
        </div>
      )}
    </PublicContainer>
  )
}

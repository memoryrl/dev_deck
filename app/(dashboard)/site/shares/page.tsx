import { Suspense } from "react"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { DatedCalendar } from "@/components/schedule/dated-calendar"
import { DateViewTabs, parseDateView } from "@/components/schedule/view-tabs"
import { ListSkeleton } from "@/components/layout/skeletons"
import { requireOwner } from "@/lib/auth/owner"
import { getT } from "@/lib/i18n/dictionary"
import { listShareLinksForAdmin } from "@/lib/share/service"
import { isSupabaseConfigured } from "@/lib/utils"
import { SharesTable } from "./shares-table"

export default async function SharesPage({ searchParams }: { searchParams?: Promise<{ view?: string }> }) {
  const { t } = await getT()
  const view = parseDateView((await searchParams)?.view)

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner title={t("share.admin.title")} description={t("share.admin.description")} />
      <DateViewTabs basePath="/site/shares" view={view} />
      {view === "calendar" ? (
        <DatedCalendar source="shares" emptyHint="이 날짜에 만든 공유 링크가 없습니다." />
      ) : (
        <Suspense fallback={<ListSkeleton withSearch={false} />}>
          <ShareList />
        </Suspense>
      )}
    </div>
  )
}

async function ShareList() {
  await requireOwner()
  const rows = isSupabaseConfigured() ? await listShareLinksForAdmin() : []
  return <SharesTable rows={rows} />
}

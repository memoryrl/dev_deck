import { Suspense } from "react"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
import { requireOwner } from "@/lib/auth/owner"
import { getT } from "@/lib/i18n/dictionary"
import { listShareLinksForAdmin } from "@/lib/share/service"
import { isSupabaseConfigured } from "@/lib/utils"
import { SharesTable } from "./shares-table"

export default function SharesPage() {
  const { t } = getT()

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner title={t("share.admin.title")} description={t("share.admin.description")} />
      <Suspense fallback={<ListSkeleton withSearch={false} />}>
        <ShareList />
      </Suspense>
    </div>
  )
}

async function ShareList() {
  await requireOwner()
  const rows = isSupabaseConfigured() ? await listShareLinksForAdmin() : []
  return <SharesTable rows={rows} />
}

import { Suspense } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListPager } from "@/components/layout/list-pager"
import { ListSkeleton } from "@/components/layout/skeletons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requireOwner } from "@/lib/auth/owner"
import { listMembers } from "@/lib/site/members"
import { getMemberStats } from "@/lib/site/member-stats"
import { getT } from "@/lib/i18n/dictionary"
import { parseListPage, parseSearchQuery } from "@/lib/pagination"
import { MemberStatsChart } from "./member-stats-chart"
import { MembersBrowser } from "./members-browser"

export default async function MembersPage(
  props: {
    searchParams?: Promise<{ page?: string; q?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const { t } = await getT()
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title={t("admin.members.title")}
        description={t("admin.members.description")}
      />

      <Suspense fallback={<ChartSkeleton />}>
        <MemberStatsChartWrapper />
      </Suspense>

      <form action="/site/members" className="flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder={t("admin.members.searchPlaceholder")}
          className="h-10 min-w-[12rem] flex-1 rounded-full shadow-none"
          aria-label={t("common.searchPlaceholder")}
        />
        <Button type="submit" className="h-10 rounded-full px-5">
          {t("common.search")}
        </Button>
        <Button asChild variant="outline" size="icon" className="size-10 shrink-0 rounded-full">
          <Link href="/site/members" aria-label={t("common.searchReset")}>
            <RefreshCw />
          </Link>
        </Button>
      </form>

      <Suspense fallback={<ListSkeleton withSearch={false} />}>
        <MemberList page={page} q={q} />
      </Suspense>
    </div>
  )
}

async function MemberList({ page, q }: { page: number; q: string }) {
  await requireOwner()
  const { t } = await getT()
  const result = await listMembers({ page, q })
  const searched = Boolean(q)

  return (
    <div>
      <h2 className="font-display text-xl font-bold">
        {t("admin.members.total", { count: result.total })}
      </h2>
      {result.total === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          {searched ? t("list.emptySearch") : t("admin.members.empty")}
        </p>
      ) : (
        <>
          <div className="mt-4">
            <MembersBrowser key={`${result.page}:${q}`} members={result.rows} />
          </div>
          <ListPager
            pathname="/site/members"
            result={result}
            extraParams={{ q: q || undefined }}
          />
        </>
      )}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border bg-white p-6 dark:bg-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="h-4 w-48 rounded bg-muted" />
        </div>
        <div className="h-9 w-36 rounded-full bg-muted" />
      </div>
      <div className="h-[280px] w-full rounded bg-muted" />
    </div>
  )
}

async function MemberStatsChartWrapper() {
  await requireOwner()
  const [yearlyData, monthlyData, dailyData] = await Promise.all([
    getMemberStats("yearly"),
    getMemberStats("monthly"),
    getMemberStats("daily"),
  ])

  return <MemberStatsChart yearlyData={yearlyData} monthlyData={monthlyData} dailyData={dailyData} />
}

import { Suspense } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { LoginHistoryRow } from "@/app/(dashboard)/site/login-history/login-history-row"
import { VisitStatsChart } from "@/app/(dashboard)/site/login-history/visit-stats-chart"
import { ListPager } from "@/components/layout/list-pager"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { ListSkeleton } from "@/components/layout/skeletons"
import { Button } from "@/components/ui/button"
import { CustomSelect } from "@/components/ui/custom-select"
import { Input } from "@/components/ui/input"
import {
  countPageViewsByVisit,
  getVisitStats,
  listLoginHistory,
  type LoginHistorySearchField,
} from "@/lib/auth/login-history"
import { getT } from "@/lib/i18n/dictionary"
import { parseListPage, parseSearchQuery } from "@/lib/pagination"
import { ensureProfile } from "@/lib/supabase/server"
import type { LoginHistoryEventType } from "@/types/login-history"

const TYPE_OPTIONS: { value: LoginHistoryEventType | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "login", label: "로그인" },
  { value: "visit", label: "접속" },
]

const FIELD_OPTIONS: { value: LoginHistorySearchField; label: string }[] = [
  { value: "email", label: "이메일" },
  { value: "ip", label: "IP" },
  { value: "region", label: "지역" },
]

function isEventType(value: string | undefined): value is LoginHistoryEventType {
  return value === "login" || value === "visit"
}

function isSearchField(value: string | undefined): value is LoginHistorySearchField {
  return value === "email" || value === "ip" || value === "region"
}

export default function LoginHistoryPage({
  searchParams,
}: {
  searchParams?: { page?: string; type?: string; q?: string; field?: string }
}) {
  const { t } = getT()
  const page = parseListPage(searchParams?.page)
  const q = parseSearchQuery(searchParams?.q)
  const activeType = isEventType(searchParams?.type) ? searchParams.type : undefined
  const field = isSearchField(searchParams?.field) ? searchParams.field : "email"

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title="로그인 · 접속 이력"
        description="구글 로그인 성공 시점과, 회원·비회원 구분 없이 사이트에 접속한 시점을 함께 기록합니다. 접속 IP와 지역 정보, 그 세션이 본 페이지 목록까지 확인할 수 있습니다."
      />

      <Suspense fallback={<ChartSkeleton />}>
        <VisitStatsChartWrapper />
      </Suspense>

      <form action="/site/login-history" className="flex flex-wrap items-center gap-2">
        <CustomSelect
          name="type"
          defaultValue={activeType ?? "all"}
          options={TYPE_OPTIONS}
          aria-label="구분"
          className="shrink-0"
          triggerClassName="h-10 rounded-full bg-field pl-4 pr-3 font-medium"
        />
        <CustomSelect
          name="field"
          defaultValue={field}
          options={FIELD_OPTIONS}
          aria-label={t("common.searchField")}
          className="shrink-0"
          triggerClassName="h-10 rounded-full bg-field pl-4 pr-3 font-medium"
        />
        <Input
          name="q"
          defaultValue={q}
          placeholder={t("common.searchPlaceholder")}
          className="h-10 min-w-[12rem] flex-1 rounded-full shadow-none"
          aria-label={t("common.searchPlaceholder")}
        />
        <Button type="submit" className="h-10 rounded-full px-5">
          {t("common.search")}
        </Button>
        <Button asChild variant="outline" size="icon" className="size-10 shrink-0 rounded-full">
          <Link href="/site/login-history" aria-label={t("common.searchReset")}>
            <RefreshCw />
          </Link>
        </Button>
      </form>

      <Suspense fallback={<ListSkeleton withSearch={false} />}>
        <LoginHistoryList page={page} q={q} activeType={activeType} field={field} />
      </Suspense>
    </div>
  )
}

async function LoginHistoryList({
  page,
  q,
  activeType,
  field,
}: {
  page: number
  q: string
  activeType?: LoginHistoryEventType
  field: LoginHistorySearchField
}) {
  await ensureProfile()
  const { t } = getT()
  const history = await listLoginHistory({ page, eventType: activeType, q, field })
  const pageCounts = await countPageViewsByVisit(history.rows.map((entry) => entry.id))
  const extra = { type: activeType, field: field === "email" ? undefined : field }
  const searched = Boolean(q)

  return (
    <div>
      <h2 className="font-display text-xl font-bold">총 {history.total}건</h2>
      {history.total === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          {searched ? t("list.emptySearch") : "아직 기록이 없습니다."}
        </p>
      ) : (
        <>
          <ul className="mt-2 divide-y border-y bg-white dark:bg-card">
            {history.rows.map((entry, index) => {
              const number = history.total - ((history.page - 1) * history.pageSize + index)
              return (
                <LoginHistoryRow
                  key={entry.id}
                  entry={entry}
                  number={number}
                  pageCount={pageCounts[entry.id] ?? 0}
                />
              )
            })}
          </ul>
          <ListPager
            pathname="/site/login-history"
            result={history}
            extraParams={{ ...extra, q: q || undefined }}
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
          <div className="h-4 w-40 rounded bg-muted" />
        </div>
        <div className="h-9 w-36 rounded-full bg-muted" />
      </div>
      <div className="h-[280px] w-full rounded bg-muted" />
    </div>
  )
}

async function VisitStatsChartWrapper() {
  await ensureProfile()
  const [yearlyData, monthlyData, dailyData] = await Promise.all([
    getVisitStats("yearly"),
    getVisitStats("monthly"),
    getVisitStats("daily"),
  ])

  return <VisitStatsChart yearlyData={yearlyData} monthlyData={monthlyData} dailyData={dailyData} />
}

import { Suspense } from "react"
import { AlertCircle, Clock, Database, Gauge, HardDrive, RefreshCw, Server, ShieldCheck } from "lucide-react"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { DatedCalendar } from "@/components/schedule/dated-calendar"
import { HealthTrend } from "./health-trend"
import { TrafficLight, type HealthLevel } from "@/components/system/traffic-light"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { requireOwner } from "@/lib/auth/owner"
import { getHealthHistory, getLatestHealthLog, isHealthLogStale, runSupabaseHealthCheck, type HealthPayload } from "@/lib/supabase-health-check"
import { formatBoardDateTime } from "@/lib/i18n/format"
import { getT } from "@/lib/i18n/dictionary"
import { cn } from "@/lib/utils"
import { revalidatePath } from "next/cache"

async function refreshSystemStatus() {
  "use server"
  revalidatePath("/site/system")
}

// 신호등 판정: 지금 점검이 실패하면 빨강, 통과해도 정기 체크가 밀렸거나·느리거나·최근에 실패한 적이 있으면 노랑, 아니면 초록.
const SLOW_MS = 3000
const LEVEL_TEXT: Record<HealthLevel, { title: string; tone: string }> = {
  ok: { title: "모든 시스템 정상", tone: "text-emerald-600 dark:text-emerald-400" },
  warn: { title: "주의가 필요합니다", tone: "text-amber-600 dark:text-amber-400" },
  error: { title: "장애가 감지되었습니다", tone: "text-red-600 dark:text-red-400" },
}

export default async function SystemStatusPage() {
  await requireOwner()
  const { t } = await getT()

  return (
    <div className="w-full space-y-6">
      <PageTitleBanner
        title={t("admin.system.title")}
        description={t("admin.system.description")}
        actions={
          <form action={refreshSystemStatus}>
            <Button type="submit" variant="outline" className="rounded-full">
              <RefreshCw className="mr-2 size-4" />
              {t("admin.system.refresh")}
            </Button>
          </form>
        }
      />

      <Suspense fallback={<SystemStatusSkeleton />}>
        <SystemStatusContent />
      </Suspense>
    </div>
  )
}

async function SystemStatusContent() {
  const { t, locale } = await getT()
  const [health, latestLog, history] = await Promise.all([runSupabaseHealthCheck(), getLatestHealthLog(), getHealthHistory(30)])

  const stale = isHealthLogStale(latestLog?.checked_at)
  const recentFailure = history.slice(0, 3).some((row) => !row.ok)
  const slow = health.durationMs > SLOW_MS
  const level: HealthLevel = !health.ok ? "error" : stale || slow || recentFailure ? "warn" : "ok"
  const reasons = [
    ...(!health.ok ? ["지금 실행한 점검이 실패했습니다"] : []),
    ...(health.ok && slow ? [`응답이 ${SLOW_MS}ms보다 느립니다`] : []),
    ...(health.ok && recentFailure ? ["최근 정기 체크에 실패 기록이 있습니다"] : []),
    ...(health.ok && stale ? ["정기 체크가 26시간 넘게 기록되지 않았습니다"] : []),
  ]

  const okCount = history.filter((row) => row.ok).length
  const trend = [...history].reverse().map((row) => ({
    label: new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", timeZone: "Asia/Seoul" }).format(new Date(row.checked_at)),
    ms: row.duration_ms ?? 0,
    ok: row.ok,
  }))
  const rate = history.length ? Math.round((okCount / history.length) * 1000) / 10 : null

  return (
    <div className="space-y-6">
      {/* 신호등 + 핵심 지표 */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex items-center justify-between gap-6 rounded-2xl border bg-white p-5 dark:bg-card sm:p-6">
          <TrafficLight level={level} />
          <div className="min-w-0 text-right">
            <h2 className={cn("font-display text-xl font-bold leading-tight sm:text-2xl", LEVEL_TEXT[level].tone)}>{LEVEL_TEXT[level].title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("admin.system.lastChecked")}: {formatBoardDateTime(health.checkedAt, locale)}
            </p>
            {reasons.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {reasons.map((reason) => (
                  <li key={reason} className="flex items-start justify-end gap-1.5 text-xs text-muted-foreground">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">Auth·DB 점검과 정기 체크가 모두 정상입니다.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Tile icon={Gauge} label={t("admin.system.responseTime")} value={`${health.durationMs}ms`} hint={slow ? "느림" : "양호"} tone={slow ? "warn" : "ok"} />
          <Tile icon={ShieldCheck} label="가동률 (최근 체크)" value={rate === null ? "-" : `${rate}%`} hint={history.length ? `${history.length}회 중 ${okCount}회 정상` : "기록 없음"} tone={rate === null ? "none" : rate === 100 ? "ok" : rate >= 90 ? "warn" : "error"} />
          <ServiceTile icon={Server} title={t("admin.system.supabaseAuth")} ok={Boolean(health.auth?.ok)} detail={`HTTP ${health.auth?.status ?? "N/A"}`} />
          <ServiceTile icon={Database} title={t("admin.system.supabaseDb")} ok={Boolean(health.db?.ok)} detail={health.db?.error ?? t("admin.system.noError")} />
          <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-white px-4 py-3 text-sm dark:bg-card">
            <span className="flex items-center gap-2 font-semibold">
              <Clock className="size-4" />
              {t("admin.system.lastHealthCheck")}
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              {latestLog ? `${formatBoardDateTime(latestLog.checked_at, locale)} · ${latestLog.ok ? t("admin.system.normal") : t("admin.system.error")} · ${latestLog.duration_ms ?? "N/A"}ms` : "기록 없음"}
              {stale ? <Badge variant="destructive">{t("admin.system.stale")}</Badge> : null}
            </span>
          </div>
        </div>
      </section>

      {/* 차트 */}
      <HealthTrend trend={trend} ok={okCount} fail={history.length - okCount} />

      {/* 캘린더 — 정기 체크가 있었던 날의 정상/장애 */}
      <section aria-label="헬스체크 캘린더" className="space-y-3">
        <div>
          <h3 className="font-display text-lg font-bold">헬스체크 캘린더</h3>
          <p className="text-sm text-muted-foreground">정기 체크(매일 새벽 3시)가 기록된 날을 보여 줍니다. 날짜를 누르면 그날의 점검 결과가 오른쪽에 나옵니다.</p>
        </div>
        <DatedCalendar source="health" emptyHint="이 날짜의 헬스체크 기록이 없습니다." />
      </section>

      {/* 환경 정보 */}
      <section className="rounded-2xl border bg-white p-5 dark:bg-card">
        <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
          <HardDrive className="size-4" />
          {t("admin.system.envInfo")}
        </h3>
        <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          {[
            [t("admin.system.nodeVersion"), process.version, true],
            [t("admin.system.environment"), process.env.NODE_ENV ?? "-", true],
            ["Supabase URL", process.env.NEXT_PUBLIC_SUPABASE_URL ? t("admin.system.configured") : t("admin.system.notConfigured"), false],
            ["Service Role Key", process.env.SUPABASE_SERVICE_ROLE_KEY ? t("admin.system.configured") : t("admin.system.notConfigured"), false],
          ].map(([label, value, mono]) => (
            <div key={String(label)} className="rounded-xl bg-muted/50 px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{String(label)}</dt>
              <dd className={cn("mt-0.5 font-semibold", mono && "font-mono")}>{String(value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {health.error ? <ErrorDetail error={health.error} /> : null}
    </div>
  )
}

const TONE: Record<"ok" | "warn" | "error" | "none", string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  error: "text-red-600 dark:text-red-400",
  none: "text-muted-foreground",
}

function Tile({ icon: Icon, label, value, hint, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint: string; tone: "ok" | "warn" | "error" | "none" }) {
  return (
    <div className="rounded-2xl border bg-white p-4 dark:bg-card">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
      <p className={cn("text-xs font-semibold", TONE[tone])}>{hint}</p>
    </div>
  )
}

function ServiceTile({ icon: Icon, title, ok, detail }: { icon: React.ComponentType<{ className?: string }>; title: string; ok: boolean; detail: string }) {
  return (
    <div className={cn("rounded-2xl border p-4", ok ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-900/15" : "border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-900/15")}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </p>
      <p className="mt-1 flex items-center gap-2 font-display text-lg font-bold">
        <span aria-hidden className={cn("size-2.5 rounded-full", ok ? "bg-emerald-500" : "bg-red-500")} />
        {ok ? "정상" : "오류"}
      </p>
      <p className="truncate text-xs text-muted-foreground" title={detail}>
        {detail}
      </p>
    </div>
  )
}

async function ErrorDetail({ error }: { error: NonNullable<HealthPayload["error"]> }) {
  const { t } = await getT()
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-900/20">
      <h3 className="mb-2 flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
        <AlertCircle className="size-5" />
        {t("admin.system.errorDetail")}
      </h3>
      <pre className="whitespace-pre-wrap font-mono text-sm text-red-600 dark:text-red-400">{error}</pre>
    </div>
  )
}

function SystemStatusSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[5fr_7fr]">
        <Skeleton className="h-56 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

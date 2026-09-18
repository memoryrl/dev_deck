import { Suspense } from "react"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Database,
  Server,
  HardDrive,
  Clock,
  RefreshCw,
} from "lucide-react"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { requireOwner } from "@/lib/auth/owner"
import {
  runSupabaseHealthCheck,
  getLatestHealthLog,
  isHealthLogStale,
  type HealthPayload,
  type HealthLogRow,
} from "@/lib/supabase-health-check"
import { formatBoardDateTime } from "@/lib/i18n/format"
import { getT } from "@/lib/i18n/dictionary"
import { revalidatePath } from "next/cache"

async function refreshSystemStatus() {
  "use server"
  revalidatePath("/site/system")
}

export default async function SystemStatusPage() {
  await requireOwner()
  const { t } = getT()

  return (
    <div className="mx-auto max-w-4xl space-y-8">
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
  const { t, locale } = getT()
  const [healthCheck, latestLog] = await Promise.all([
    runSupabaseHealthCheck(),
    getLatestHealthLog(),
  ])

  const isStale = isHealthLogStale(latestLog?.checked_at)

  return (
    <div className="space-y-6">
      {/* 현재 상태 요약 */}
      <div className="rounded-xl border bg-white p-6 dark:bg-card">
        <div className="flex items-center gap-4">
          {healthCheck.ok ? (
            <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="size-8 text-green-600" />
            </div>
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="size-8 text-red-600" />
            </div>
          )}
          <div>
            <h2 className="font-display text-2xl font-bold">
              {healthCheck.ok ? t("admin.system.systemNormal") : t("admin.system.systemError")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("admin.system.lastChecked")}: {formatBoardDateTime(healthCheck.checkedAt, locale)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("admin.system.responseTime")}: {healthCheck.durationMs}ms
            </p>
          </div>
        </div>
      </div>

      {/* 서비스별 상태 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatusCard
          title={t("admin.system.supabaseAuth")}
          icon={Server}
          status={healthCheck.auth?.ok ? "ok" : "error"}
          details={[
            { label: t("admin.system.status"), value: healthCheck.auth?.ok ? t("admin.system.normal") : t("admin.system.error") },
            { label: t("admin.system.httpStatus"), value: String(healthCheck.auth?.status ?? "N/A") },
          ]}
        />
        <StatusCard
          title={t("admin.system.supabaseDb")}
          icon={Database}
          status={healthCheck.db?.ok ? "ok" : "error"}
          details={[
            { label: t("admin.system.status"), value: healthCheck.db?.ok ? t("admin.system.normal") : t("admin.system.error") },
            { label: t("admin.system.error"), value: healthCheck.db?.error ?? t("admin.system.noError") },
          ]}
        />
      </div>

      {/* 마지막 헬스체크 로그 */}
      {latestLog && (
        <HealthLogSection latestLog={latestLog} isStale={isStale} />
      )}

      {/* 환경 정보 */}
      <EnvironmentInfo />

      {/* 에러 메시지 */}
      {healthCheck.error && (
        <ErrorDetail error={healthCheck.error} />
      )}
    </div>
  )
}

function HealthLogSection({ latestLog, isStale }: { latestLog: HealthLogRow; isStale: boolean }) {
  const { t, locale } = getT()

  return (
    <div className="rounded-xl border bg-white p-6 dark:bg-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold">
          <Clock className="size-5" />
          {t("admin.system.lastHealthCheck")}
        </h3>
        {isStale && (
          <Badge variant="destructive">{t("admin.system.stale")}</Badge>
        )}
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("admin.system.checkTime")}</span>
          <span>{formatBoardDateTime(latestLog.checked_at, locale)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("admin.system.status")}</span>
          <span>{latestLog.ok ? t("admin.system.normal") : t("admin.system.error")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("admin.system.responseTime")}</span>
          <span>{latestLog.duration_ms ?? "N/A"}ms</span>
        </div>
        {latestLog.error_message && (
          <div className="mt-2 rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {latestLog.error_message}
          </div>
        )}
      </div>
    </div>
  )
}

function EnvironmentInfo() {
  const { t } = getT()

  return (
    <div className="rounded-xl border bg-white p-6 dark:bg-card">
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
        <HardDrive className="size-5" />
        {t("admin.system.envInfo")}
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("admin.system.nodeVersion")}</span>
          <span className="font-mono">{process.version}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("admin.system.environment")}</span>
          <span className="font-mono">{process.env.NODE_ENV}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Supabase URL</span>
          <span className="truncate font-mono text-xs">
            {process.env.NEXT_PUBLIC_SUPABASE_URL ? t("admin.system.configured") : t("admin.system.notConfigured")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Service Role Key</span>
          <span className="font-mono">
            {process.env.SUPABASE_SERVICE_ROLE_KEY ? t("admin.system.configured") : t("admin.system.notConfigured")}
          </span>
        </div>
      </div>
    </div>
  )
}

function ErrorDetail({ error }: { error: string }) {
  const { t } = getT()

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/20">
      <h3 className="mb-2 flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
        <AlertCircle className="size-5" />
        {t("admin.system.errorDetail")}
      </h3>
      <pre className="whitespace-pre-wrap font-mono text-sm text-red-600 dark:text-red-400">
        {error}
      </pre>
    </div>
  )
}

function StatusCard({
  title,
  icon: Icon,
  status,
  details,
}: {
  title: string
  icon: React.ElementType
  status: "ok" | "error" | "warning"
  details: { label: string; value: string }[]
}) {
  const statusConfig = {
    ok: {
      bgColor: "bg-green-50 dark:bg-green-900/20",
      iconColor: "text-green-600",
      borderColor: "border-green-200 dark:border-green-800",
    },
    error: {
      bgColor: "bg-red-50 dark:bg-red-900/20",
      iconColor: "text-red-600",
      borderColor: "border-red-200 dark:border-red-800",
    },
    warning: {
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      iconColor: "text-yellow-600",
      borderColor: "border-yellow-200 dark:border-yellow-800",
    },
  }

  const config = statusConfig[status]

  return (
    <div className={`rounded-xl border p-5 ${config.bgColor} ${config.borderColor}`}>
      <div className="mb-3 flex items-center gap-3">
        <Icon className={`size-6 ${config.iconColor}`} />
        <h3 className="font-semibold">{title}</h3>
        {status === "ok" ? (
          <CheckCircle className="ml-auto size-5 text-green-600" />
        ) : (
          <XCircle className="ml-auto size-5 text-red-600" />
        )}
      </div>
      <div className="space-y-1 text-sm">
        {details.map((detail) => (
          <div key={detail.label} className="flex justify-between">
            <span className="text-muted-foreground">{detail.label}</span>
            <span className="truncate">{detail.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SystemStatusSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}

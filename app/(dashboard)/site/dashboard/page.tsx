import { Suspense } from "react"
import Link from "next/link"
import {
  FileText,
  MessageSquare,
  Sparkles,
  Users,
  Upload,
  Activity,
  Clock,
} from "lucide-react"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ContentDonut, MonthlyBarChart, VisitAreaChart } from "@/components/dashboard/dashboard-charts"
import { DashboardHero } from "@/components/dashboard/dashboard-hero"
import { getVisitStats } from "@/lib/auth/login-history"
import { requireOwner } from "@/lib/auth/owner"
import { getDashboardStats, getRecentActivity, type RecentActivity } from "@/lib/site/dashboard-stats"
import { formatBoardDateTime } from "@/lib/i18n/format"
import type { AppLocale } from "@/lib/i18n/config"
import { getT } from "@/lib/i18n/dictionary"

export default async function DashboardHomePage() {
  await requireOwner()
  const { t } = await getT()

  return (
    <div className="w-full space-y-8">
      <PageTitleBanner title={t("admin.dashboard.title")} />

      <Suspense fallback={<StatsSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}

async function DashboardContent() {
  const [stats, activities, dailyVisits, monthlyVisits] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(8),
    getVisitStats("daily"),
    getVisitStats("monthly"),
  ])
  const { t, locale } = await getT()
  const towerItems = [
    { label: t("admin.dashboard.posts"), value: stats.totalPosts },
    { label: t("admin.dashboard.comments"), value: stats.totalComments },
    { label: t("admin.dashboard.prompts"), value: stats.totalPrompts },
    { label: t("admin.dashboard.uploads"), value: stats.totalUploads },
    { label: t("admin.dashboard.members"), value: stats.totalProfiles },
  ]

  return (
    <div className="space-y-8">
      {/* 3D 개요 + 차트 */}
      <DashboardHero
        title={t("admin.dashboard.visitorStats")}
        kpis={[
          { label: t("admin.dashboard.today"), value: stats.totalVisitsToday },
          { label: t("admin.dashboard.week"), value: stats.totalVisitsWeek },
          { label: t("admin.dashboard.month"), value: stats.totalVisitsMonth },
        ]}
        towers={towerItems}
      />
      <section className="grid gap-4 lg:grid-cols-3">
        <VisitAreaChart className="lg:col-span-2" title="일별 방문 추이" subtitle="최근 30일" data={dailyVisits} unit="건" />
        <ContentDonut title={t("admin.dashboard.contentStatus")} items={towerItems} totalLabel="total" />
      </section>
      <MonthlyBarChart title="월별 방문" subtitle="최근 12개월" data={monthlyVisits} unit="건" />

      {/* 콘텐츠 통계 */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
          <Activity className="size-5" />
          {t("admin.dashboard.contentStatus")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label={t("admin.dashboard.posts")}
            value={stats.totalPosts}
            icon={FileText}
            href="/site/boards"
          />
          <StatCard
            label={t("admin.dashboard.comments")}
            value={stats.totalComments}
            icon={MessageSquare}
            href="/site/comments"
          />
          <StatCard
            label={t("admin.dashboard.prompts")}
            value={stats.totalPrompts}
            icon={Sparkles}
            href="/promptkit"
          />
          <StatCard
            label={t("admin.dashboard.uploads")}
            value={stats.totalUploads}
            icon={Upload}
            href="/site/uploads"
          />
        </div>
      </section>

      {/* 회원 통계 */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
          <Users className="size-5" />
          {t("admin.dashboard.memberStatus")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatCard
            label={t("admin.dashboard.members")}
            value={stats.totalProfiles}
            icon={Users}
            href="/site/members"
          />
        </div>
      </section>

      {/* 최근 활동 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <Clock className="size-5" />
            {t("admin.dashboard.recentActivity")}
          </h2>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/site/login-history">{t("admin.dashboard.viewAll")}</Link>
          </Button>
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("common.empty")}</p>
        ) : (
          <div className="rounded-xl border bg-white dark:bg-card">
            <ul className="divide-y">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} locale={locale} />
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 빠른 링크 */}
      <section>
        <h2 className="mb-4 font-display text-xl font-bold">{t("admin.dashboard.quickLinks")}</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/site/menus">{t("nav.menus")}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/site/design-system/common">{t("nav.designSystem")}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/site/settings">{t("nav.settings")}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/site/system">{t("nav.system")}</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  color = "text-foreground",
  bgColor = "bg-muted/50",
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  href?: string
  color?: string
  bgColor?: string
}) {
  const content = (
    <div className={`rounded-xl border bg-white p-3 transition-colors sm:p-5 dark:bg-card ${href ? "hover:border-primary/50" : ""}`}>
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className={`flex size-10 sm:size-12 items-center justify-center rounded-xl ${bgColor}`}>
          <Icon className={`size-6 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground sm:text-sm">{label}</p>
          <p className="font-display text-xl font-bold sm:text-2xl">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

async function ActivityItem({ activity, locale }: { activity: RecentActivity; locale: AppLocale }) {
  const { t } = await getT()
  const typeConfig = {
    comment: { badge: t("admin.dashboard.comment"), variant: "default" as const },
    visit: { badge: t("admin.dashboard.visit"), variant: "secondary" as const },
    post: { badge: t("admin.dashboard.post"), variant: "outline" as const },
  }

  const config = typeConfig[activity.type]

  return (
    <li className="flex items-center gap-4 px-5 py-3">
      <Badge variant={config.variant} className="shrink-0">
        {config.badge}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{activity.title}</p>
        <p className="truncate text-sm text-muted-foreground">{activity.description}</p>
      </div>
      <time className="shrink-0 text-xs text-muted-foreground">
        {formatBoardDateTime(activity.createdAt, locale)}
      </time>
    </li>
  )
}

function StatsSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-96 rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  )
}

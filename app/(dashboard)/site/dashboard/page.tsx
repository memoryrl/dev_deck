import { Suspense } from "react"
import Link from "next/link"
import {
  FileText,
  MessageSquare,
  Sparkles,
  Users,
  Eye,
  Upload,
  TrendingUp,
  Activity,
  Clock,
} from "lucide-react"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { requireOwner } from "@/lib/auth/owner"
import { getDashboardStats, getRecentActivity, type RecentActivity } from "@/lib/site/dashboard-stats"
import { formatBoardDateTime } from "@/lib/i18n/format"
import type { AppLocale } from "@/lib/i18n/config"
import { getT } from "@/lib/i18n/dictionary"

export default async function DashboardHomePage() {
  await requireOwner()
  const { t } = getT()

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
  const [stats, activities] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(8),
  ])
  const { t, locale } = getT()

  return (
    <div className="space-y-8">
      {/* 방문자 통계 */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
          <TrendingUp className="size-5" />
          {t("admin.dashboard.visitorStats")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={t("admin.dashboard.today")}
            value={stats.totalVisitsToday}
            icon={Eye}
            color="text-green-600"
            bgColor="bg-green-50 dark:bg-green-950/30"
          />
          <StatCard
            label={t("admin.dashboard.week")}
            value={stats.totalVisitsWeek}
            icon={Eye}
            color="text-blue-600"
            bgColor="bg-blue-50 dark:bg-blue-950/30"
          />
          <StatCard
            label={t("admin.dashboard.month")}
            value={stats.totalVisitsMonth}
            icon={Eye}
            color="text-purple-600"
            bgColor="bg-purple-50 dark:bg-purple-950/30"
          />
        </div>
      </section>

      {/* 콘텐츠 통계 */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
          <Activity className="size-5" />
          {t("admin.dashboard.contentStatus")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="grid gap-4 sm:grid-cols-2">
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
  icon: React.ElementType
  href?: string
  color?: string
  bgColor?: string
}) {
  const content = (
    <div className={`rounded-xl border bg-white p-5 transition-colors dark:bg-card ${href ? "hover:border-primary/50" : ""}`}>
      <div className="flex items-center gap-4">
        <div className={`flex size-12 items-center justify-center rounded-xl ${bgColor}`}>
          <Icon className={`size-6 ${color}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

function ActivityItem({ activity, locale }: { activity: RecentActivity; locale: AppLocale }) {
  const { t } = getT()
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
      <section>
        <Skeleton className="mb-4 h-7 w-32" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </section>
      <section>
        <Skeleton className="mb-4 h-7 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  )
}

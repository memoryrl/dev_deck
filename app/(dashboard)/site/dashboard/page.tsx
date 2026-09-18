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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageTitleBanner
        title="대시보드"
        breadcrumb={[{ label: "사이트 관리" }]}
      />

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
  const { locale } = getT()

  return (
    <div className="space-y-8">
      {/* 방문자 통계 */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
          <TrendingUp className="size-5" />
          방문자 통계
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="오늘"
            value={stats.totalVisitsToday}
            icon={Eye}
            color="text-green-600"
            bgColor="bg-green-50 dark:bg-green-950/30"
          />
          <StatCard
            label="최근 7일"
            value={stats.totalVisitsWeek}
            icon={Eye}
            color="text-blue-600"
            bgColor="bg-blue-50 dark:bg-blue-950/30"
          />
          <StatCard
            label="최근 30일"
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
          콘텐츠 현황
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="게시글"
            value={stats.totalPosts}
            icon={FileText}
            href="/site/boards"
          />
          <StatCard
            label="댓글"
            value={stats.totalComments}
            icon={MessageSquare}
            href="/site/comments"
          />
          <StatCard
            label="프롬프트"
            value={stats.totalPrompts}
            icon={Sparkles}
            href="/promptkit"
          />
          <StatCard
            label="업로드"
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
          회원 현황
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="가입 회원"
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
            최근 활동
          </h2>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/site/login-history">전체 보기</Link>
          </Button>
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">최근 활동이 없습니다.</p>
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
        <h2 className="mb-4 font-display text-xl font-bold">빠른 링크</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/site/menus">메뉴 관리</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/site/design-system/common">디자인 시스템</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/site/settings">사이트 설정</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/site/system">시스템 상태</Link>
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
  const typeConfig = {
    comment: { badge: "댓글", variant: "default" as const },
    visit: { badge: "접속", variant: "secondary" as const },
    post: { badge: "게시글", variant: "outline" as const },
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

import Link from "next/link"
import { PageTitleBanner } from "@/components/layout/page-title-banner"
import { requireOwner } from "@/lib/auth/owner"
import { getT } from "@/lib/i18n/dictionary"
import { getThemeHistory } from "@/lib/site/theme"
import { ThemeHistory } from "./theme-history"
import { ThemeHistoryScheduler } from "./theme-history-scheduler"
import { getSiteSettings } from "@/lib/site/settings"
import { ThemeRemoteSwitch } from "./theme-remote-switch"
import type { Metadata } from "next"

const TABS = [
  { id: "calendar", label: "캘린더", href: "/site/theme" },
  { id: "list", label: "전체목록", href: "/site/theme?view=list" },
] as const

export const metadata: Metadata = { title: "테마 설정 · DevDeck", robots: { index: false, follow: false } }

export default async function SiteThemePage({ searchParams }: { searchParams?: Promise<{ view?: string }> }) {
  await requireOwner()
  const [{ t }, history, settings, params] = await Promise.all([getT(), getThemeHistory(), getSiteSettings(), searchParams])
  // 상단 탭: 캘린더(기본) / 전체목록 — 접속이력 화면과 같은 구성
  const view = params?.view === "list" ? "list" : "calendar"
  const currentId = history[0]?.id ?? null
  return (
    <div className="w-full space-y-8">
      <PageTitleBanner
        title={t("nav.theme")}
        description="오른쪽 위 스위치를 켜면 관리자 로그인 상태에서 모든 화면에 테마 원격 제어기 레이어가 떠서 색상·글꼴·모서리·너비·모션을 바로 바꿔 볼 수 있습니다. 저장 전에는 이 브라우저에서만 미리 보입니다."
        actions={<ThemeRemoteSwitch initial={settings.themeRemoteVisible} />}
      />

      <nav role="tablist" aria-label="이력 보기 방식" className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={view === tab.id}
            className={`-mb-px border-b-2 px-5 py-2.5 text-sm font-semibold transition-colors ${
              view === tab.id ? "border-[hsl(var(--lux-champagne))] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {view === "calendar" ? <ThemeHistoryScheduler entries={history} currentId={currentId} /> : <ThemeHistory entries={history} currentId={currentId} />}
    </div>
  )
}

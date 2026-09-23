import type { ReactNode } from "react"
import { Suspense } from "react"
import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { NoticePopupLauncher } from "@/components/layout/notice-popup"
import { PortfolioAskWidget } from "@/components/portfolio-assistant/portfolio-ask-widget"
import { currentViewer } from "@/lib/boards/access"
import { parseNoticePopupMode } from "@/lib/boards/notice-popup-window"
import { getNoticePopupPost } from "@/lib/boards/community"
import { getT } from "@/lib/i18n/dictionary"
import { getSiteSettings } from "@/lib/site/settings"

function HeaderFallback() {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b bg-background/80 backdrop-blur" />
      <div className="h-14 shrink-0" aria-hidden />
    </>
  )
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen max-w-full flex-col">
      <Suspense fallback={<HeaderFallback />}>
        <PublicHeader />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        {/* 바디 최소 높이 — 스켈레톤이나 짧은 페이지에서도 푸터가 위로 딸려 올라오지 않게 한다.
            자식 페이지의 flex-1(main, PublicContainer)이 그대로 늘어나도록 flex 컬럼으로 둔다. */}
        <div className="flex min-w-0 flex-1 flex-col min-h-[70dvh]">{children}</div>
        <Suspense fallback={null}>
          <PublicFooter />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <NoticePopupSlot />
      </Suspense>
      <Suspense fallback={null}>
        <PortfolioAskSlot />
      </Suspense>
    </div>
  )
}

async function PortfolioAskSlot() {
  const viewer = await currentViewer()
  return <PortfolioAskWidget signedIn={viewer.role !== "visitor"} />
}

async function NoticePopupSlot() {
  const [post, settings] = await Promise.all([getNoticePopupPost(), getSiteSettings()])
  if (!post) return null
  const { t } = await getT()
  return (
    <NoticePopupLauncher
      post={post}
      mode={parseNoticePopupMode(settings.noticePopupMode)}
      label={t("mega.community.notice")}
    />
  )
}

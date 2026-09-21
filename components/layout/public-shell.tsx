import type { ReactNode } from "react"
import { Suspense } from "react"
import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { NoticePopupLauncher } from "@/components/layout/notice-popup"
import { getNoticePopupPost } from "@/lib/boards/community"

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
        {children}
        <Suspense fallback={null}>
          <PublicFooter />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <NoticePopupSlot />
      </Suspense>
    </div>
  )
}

async function NoticePopupSlot() {
  const post = await getNoticePopupPost()
  if (!post) return null
  return <NoticePopupLauncher postId={post.id} />
}

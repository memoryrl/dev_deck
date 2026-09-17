import { Suspense } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Skeleton } from "@/components/ui/skeleton"
import { sessionUserView } from "@/lib/auth/session-user"
import { currentViewer } from "@/lib/boards/access"

function DashboardHeaderFallback() {
  return (
    <header className="sticky top-0 z-[60] flex h-14 items-center justify-end gap-2 border-b bg-background/90 px-4 backdrop-blur md:px-5">
      <Skeleton className="size-9 rounded-full" />
      <Skeleton className="hidden h-9 w-28 rounded-full md:block" />
    </header>
  )
}

async function DashboardHeaderResolved() {
  const viewer = await currentViewer()
  const account = viewer.user ? sessionUserView(viewer.user) : sessionUserView({ email: null })
  return <DashboardHeader account={account} />
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-muted/40">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<DashboardHeaderFallback />}>
          <DashboardHeaderResolved />
        </Suspense>
        <main className="flex-1 px-5 py-8">{children}</main>
      </div>
    </div>
  )
}

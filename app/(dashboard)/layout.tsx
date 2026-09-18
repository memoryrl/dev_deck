import { Suspense, cache } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { Skeleton } from "@/components/ui/skeleton"
import { sessionUserView } from "@/lib/auth/session-user"
import { currentViewer } from "@/lib/boards/access"
import { ensureAdminMenus, listAdminMenus } from "@/lib/menus/admin"

function DashboardHeaderFallback() {
  return (
    <header className="sticky top-0 z-[60] flex h-14 items-center justify-end gap-2 border-b bg-background/90 px-4 backdrop-blur md:px-5">
      <Skeleton className="size-9 rounded-full" />
      <Skeleton className="hidden h-9 w-28 rounded-full md:block" />
    </header>
  )
}

function SidebarFallback() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card p-5 md:flex">
      <Skeleton className="mb-8 h-7 w-24" />
      <div className="flex-1 space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 rounded-2xl" />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-10 w-full rounded-full" />
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
    </aside>
  )
}

const loadAdminChrome = cache(async () => {
  await ensureAdminMenus()
  const [viewer, menus] = await Promise.all([
    currentViewer(),
    listAdminMenus(),
  ])
  const account = viewer.user ? sessionUserView(viewer.user) : sessionUserView({ email: null })
  return { account, menus }
})

async function DashboardSidebar() {
  const { menus } = await loadAdminChrome()
  return <AppSidebar menus={menus} />
}

async function DashboardHeaderSlot() {
  const { account, menus } = await loadAdminChrome()
  return <DashboardHeader account={account} menus={menus} />
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-muted/40">
      <Suspense fallback={<SidebarFallback />}>
        <DashboardSidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<DashboardHeaderFallback />}>
          <DashboardHeaderSlot />
        </Suspense>
        <main className="flex-1 px-5 py-8">{children}</main>
      </div>
    </div>
  )
}

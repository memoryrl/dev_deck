import { AppSidebar } from "@/components/layout/app-sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { sessionUserView } from "@/lib/auth/session-user"
import { currentViewer } from "@/lib/boards/access"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const viewer = await currentViewer()
  const account = viewer.user ? sessionUserView(viewer.user) : sessionUserView({ email: null })

  return (
    <div className="flex min-h-screen bg-muted/40">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader account={account} />
        <main className="flex-1 px-5 py-8">{children}</main>
      </div>
    </div>
  )
}

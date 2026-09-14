import { AppSidebar } from "@/components/layout/app-sidebar"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { sessionUserView } from "@/lib/auth/session-user"
import { currentViewer } from "@/lib/boards/access"
import Link from "next/link"

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
        <header className="flex items-center justify-between border-b bg-background/90 px-5 py-3 backdrop-blur">
          <nav className="flex gap-3 text-sm font-semibold md:hidden">
            <Link href="/promptkit">PromptKit</Link>
            <Link href="/career">Career</Link>
            <Link href="/steam">Steam</Link>
            <Link href="/site/boards">게시판</Link>
            <Link href="/site/comments">댓글</Link>
            <Link href="/site/menus">메뉴</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <UserMenu user={account} />
          </div>
        </header>
        <main className="flex-1 px-5 py-8">{children}</main>
      </div>
    </div>
  )
}

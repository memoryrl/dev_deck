import { AppSidebar } from "@/components/layout/app-sidebar"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/utils"
import Link from "next/link"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let name: string | null = null
  if (isSupabaseConfigured()) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    name =
      (user?.user_metadata.full_name as string | undefined) ??
      (user?.user_metadata.name as string | undefined) ??
      user?.email ??
      null
  }

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
            <Link href="/site/menus">메뉴</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <UserMenu name={name} />
          </div>
        </header>
        <main className="flex-1 px-5 py-8">{children}</main>
      </div>
    </div>
  )
}

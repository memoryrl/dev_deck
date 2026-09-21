"use client"

import Link from "next/link"
import { useEffect, useId, useState } from "react"
import { usePathname } from "next/navigation"
import { Home, LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { useI18n } from "@/components/i18n/i18n-provider"
import type { AdminSidebarGroup } from "@/components/layout/admin-nav"
import { LogoutButton } from "@/components/layout/logout-button"
import { AdminSidebarNav } from "@/components/layout/admin-sidebar-nav"
import { UserMenu } from "@/components/layout/user-menu"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import type { SessionUserView } from "@/lib/auth/session-user"
import { lockDocumentScroll } from "@/lib/dom/lock-scroll"
import { cn } from "@/lib/utils"

type Props = {
  account: SessionUserView
  menus?: AdminSidebarGroup[]
}

export function DashboardHeader({ account, menus = [] }: Props) {
  const [drawer, setDrawer] = useState(false)
  const pathname = usePathname()
  const titleId = useId()
  const { t } = useI18n()

  useEffect(() => {
    setDrawer(false)
  }, [pathname])

  useEffect(() => {
    if (!drawer) return
    const unlock = lockDocumentScroll()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawer(false)
    }
    document.addEventListener("keydown", onKey)
    return () => {
      unlock()
      document.removeEventListener("keydown", onKey)
    }
  }, [drawer])

  return (
    <>
      <header className="sticky top-0 z-[60] flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-5">
        <Link href="/" className="font-display text-lg font-extrabold md:hidden">
          DevDeck
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          <Button asChild variant="ghost" size="icon" className="rounded-full md:hidden">
            <Link href="/" aria-label={t("dashboard.homeAria")}>
              <Home className="size-5" />
            </Link>
          </Button>
          <ThemeToggle className="hidden md:inline-flex" />
          <div className="md:hidden">
            <UserMenu user={account} compact />
          </div>
          <div className="hidden md:block">
            <UserMenu user={account} />
          </div>
          <button
            type="button"
            className="relative z-[70] inline-flex size-10 items-center justify-center rounded-full hover:bg-foreground/[0.06] md:hidden"
            aria-expanded={drawer}
            aria-controls="dashboard-mobile-nav"
            aria-label={drawer ? t("common.closeMenu") : t("common.openMenu")}
            onClick={() => setDrawer((value) => !value)}
          >
            {drawer ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 top-14 z-50 md:hidden">
        <button
          type="button"
          aria-label={t("common.closeMenu")}
          className={cn(
            "absolute inset-0 bg-foreground/35 backdrop-blur-[2px] transition-opacity duration-300",
            drawer ? "pointer-events-auto opacity-100" : "opacity-0"
          )}
          onClick={() => setDrawer(false)}
        />
        <aside
          id="dashboard-mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            "absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col border-l bg-background shadow-2xl transition-transform duration-300 ease-out",
            drawer ? "pointer-events-auto translate-x-0" : "translate-x-full"
          )}
        >
          <h2 id={titleId} className="sr-only">
            {t("dashboard.adminMenu")}
          </h2>
          <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
            <AdminSidebarNav groups={menus} onNavigate={() => setDrawer(false)} />
            <div className="mt-4 shrink-0 space-y-2">
              <LanguageSwitcher fullWidth menuPlacement="up" />
              <Button asChild variant="outline" className="h-10 w-full rounded-full">
                <Link href="/" onClick={() => setDrawer(false)}>
                  <Home />
                  {t("common.siteHome")}
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 border-t px-5 py-4">
            <LogoutButton className="flex flex-1 items-center justify-center gap-2 rounded-full border border-input px-4 py-2.5 text-sm font-medium">
              <LogOut className="size-4" />
              {t("common.logout")}
            </LogoutButton>
            <ThemeToggle className="rounded-full" />
          </div>
        </aside>
      </div>
    </>
  )
}

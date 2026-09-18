"use client"

import Link from "next/link"
import { useEffect, useId, useState } from "react"
import { usePathname } from "next/navigation"
import {
  Briefcase,
  Gamepad2,
  History,
  Home,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Menu,
  MessageSquare,
  Monitor,
  Palette,
  Settings,
  Sparkles,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { useI18n } from "@/components/i18n/i18n-provider"
import { signOut } from "@/app/(dashboard)/promptkit/actions"
import { UserMenu } from "@/components/layout/user-menu"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import type { SessionUserView } from "@/lib/auth/session-user"
import { cn } from "@/lib/utils"

export type AdminMenuItemForHeader = {
  id: string
  label: string
  href: string
  iconName: string
}

type Props = {
  account: SessionUserView
  menus?: AdminMenuItemForHeader[]
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Sparkles,
  Briefcase,
  Gamepad2,
  LayoutList,
  MessageSquare,
  Menu,
  Upload,
  Users,
  History,
  Settings,
  Monitor,
  Palette,
}

function getIconComponent(name: string): LucideIcon {
  return ICON_MAP[name] ?? LayoutDashboard
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
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawer(false)
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
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
          <div className="border-b px-3 py-3">
            <LanguageSwitcher />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <Link
              href="/"
              className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-foreground/[0.05]"
              onClick={() => setDrawer(false)}
            >
              <Home className="size-4 opacity-70" />
              {t("common.siteHome")}
            </Link>
            {menus.map((item) => {
              const Icon = getIconComponent(item.iconName)
              const active = pathname.startsWith(item.href)
              const label = t(item.label) || item.label
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold",
                    active ? "bg-primary text-primary-foreground" : "hover:bg-foreground/[0.05]"
                  )}
                  onClick={() => setDrawer(false)}
                >
                  <Icon className="size-4 opacity-70" />
                  {label}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-2 border-t px-5 py-4">
            <form action={signOut} className="flex-1">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-full border border-input px-4 py-2.5 text-sm font-medium"
              >
                <LogOut className="size-4" />
                {t("common.logout")}
              </button>
            </form>
            <ThemeToggle className="rounded-full" />
          </div>
        </aside>
      </div>
    </>
  )
}

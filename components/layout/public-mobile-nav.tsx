"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useState } from "react"
import { ChevronDown, LogOut } from "lucide-react"
import type { AdminSidebarGroup } from "@/components/layout/admin-nav"
import { LogoutButton } from "@/components/layout/logout-button"
import { AdminMenuGroups } from "@/components/layout/admin-menu-groups"
import { UserAvatar } from "@/components/layout/account-menu"
import { MENU_ICON, megaIdFromLabelKey, type MegaId } from "@/components/layout/public-nav-data"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useI18n } from "@/components/i18n/i18n-provider"
import { lockDocumentScroll } from "@/lib/dom/lock-scroll"
import { isActiveHref, pickActiveHref } from "@/lib/menus/active"
import { cn } from "@/lib/utils"
import type { SessionUserView } from "@/lib/auth/session-user"
import type { NavNode } from "@/types/menu"

export function PublicMobileNav({
  open,
  onClose,
  account,
  navNodes,
  adminMenus = [],
}: {
  open: boolean
  onClose: () => void
  account: SessionUserView | null
  navNodes: NavNode[]
  adminMenus?: AdminSidebarGroup[]
}) {
  const [section, setSection] = useState<string | null>(null)
  const titleId = useId()
  const { t } = useI18n()
  const pathname = usePathname()
  const activeHref = pickActiveHref(
    pathname,
    navNodes.flatMap((menu) => [menu.href, ...menu.children.map((child) => child.href)])
  )

  useEffect(() => {
    if (!open) setSection(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const unlock = lockDocumentScroll()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      unlock()
      document.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 top-14 z-50 lg:hidden">
      <button
        type="button"
        aria-label={t("common.closeMenu")}
        className={cn(
          "absolute inset-0 bg-foreground/35 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "pointer-events-auto opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        id="public-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col border-l bg-background shadow-2xl transition-transform duration-300 ease-out",
          open ? "pointer-events-auto translate-x-0" : "translate-x-full"
        )}
      >
        <h2 id={titleId} className="sr-only">
          {t("common.siteMenu")}
        </h2>
        {account ? (
          <div className="flex items-center gap-3 border-b px-4 py-4">
            <UserAvatar name={account.name} src={account.avatarUrl} className="size-11" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{account.name}</p>
              {account.email ? <p className="truncate text-xs text-muted-foreground">{account.email}</p> : null}
              <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{t(`role.${account.role}`)}</p>
            </div>
          </div>
        ) : null}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navNodes.map((menu) => {
            const megaId = (menu.id as MegaId) in MENU_ICON ? (menu.id as MegaId) : megaIdFromLabelKey(menu.labelKey)
            const Icon = megaId ? MENU_ICON[megaId] : undefined
            const expanded = section === menu.id
            const current =
              isActiveHref(activeHref, menu.href) || menu.children.some((child) => isActiveHref(activeHref, child.href))
            if (menu.href && menu.children.length === 0) {
              return (
                <Link
                  key={menu.id}
                  href={menu.href}
                  className={cn(
                    "flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-foreground/[0.05]",
                    current && "bg-foreground/[0.06] font-extrabold"
                  )}
                  aria-current={current ? "page" : undefined}
                  onClick={onClose}
                >
                  {menu.label}
                </Link>
              )
            }
            return (
              <div key={menu.id} className="mb-1">
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-foreground/[0.05]",
                    expanded && "bg-foreground/[0.06]",
                    current && "font-extrabold"
                  )}
                  aria-expanded={expanded}
                  onClick={() => setSection(expanded ? null : menu.id)}
                >
                  {Icon ? <Icon className="size-4 opacity-70" /> : null}
                  <span className="flex-1">{menu.label}</span>
                  <ChevronDown className={cn("size-4 opacity-50 transition-transform", expanded && "rotate-180")} />
                </button>
                {expanded ? (
                  <div className="mb-2 ml-2 mt-1 space-y-1 border-l border-foreground/10 pl-3">
                    {menu.children.map((link) => {
                      const linkCurrent = isActiveHref(activeHref, link.href)
                      return (
                      <Link
                        key={link.id}
                        href={link.href}
                        className="block rounded-xl px-3 py-2 hover:bg-foreground/[0.05]"
                        aria-current={linkCurrent ? "page" : undefined}
                        onClick={onClose}
                      >
                        <span className={cn("text-sm font-medium", linkCurrent && "font-extrabold")}>{link.label}</span>
                        {link.note ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">{link.note}</span>
                        ) : null}
                      </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
          {account?.isOwner ? (
            <div className="mt-3 border-t border-foreground/10 pt-3">
              <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {t("common.admin")}
              </p>
              <AdminMenuGroups groups={adminMenus} onNavigate={onClose} />
            </div>
          ) : null}
          {account ? (
            <Link
              href="/account"
              className="mt-2 flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-foreground/[0.05]"
              onClick={onClose}
            >
              {t("common.mypage")}
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2 border-t px-5 py-4">
          {account ? (
            <LogoutButton className="flex flex-1 items-center justify-center gap-2 rounded-full border border-input px-4 py-2.5 text-sm font-medium">
              <LogOut className="size-4" />
              {t("common.logout")}
            </LogoutButton>
          ) : (
            <Link
              href="/login"
              className="flex-1 rounded-full bg-foreground px-4 py-2.5 text-center text-sm font-medium text-background"
              onClick={onClose}
            >
              {t("common.login")}
            </Link>
          )}
          <ThemeToggle className="rounded-full" />
        </div>
      </aside>
    </div>
  )
}

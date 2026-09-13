"use client"

import Link from "next/link"
import { useEffect, useId, useState } from "react"
import { ChevronDown } from "lucide-react"
import { MENU_ICON, type MegaId } from "@/components/layout/public-nav-data"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { cn } from "@/lib/utils"
import type { NavNode } from "@/types/menu"

export function PublicMobileNav({
  open,
  onClose,
  signedIn,
  accountHref,
  navNodes,
}: {
  open: boolean
  onClose: () => void
  signedIn: boolean
  accountHref: string
  navNodes: NavNode[]
}) {
  const [section, setSection] = useState<string | null>(null)
  const titleId = useId()
  const owner = accountHref === "/promptkit"
  const accountLabel = signedIn ? (owner ? "대시보드" : "내 계정") : "로그인"

  useEffect(() => {
    if (!open) setSection(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  return (
    <div className={cn("fixed inset-0 z-50 lg:hidden", !open && "pointer-events-none")}>
      <button
        type="button"
        aria-label="메뉴 닫기"
        className={cn(
          "absolute inset-x-0 bottom-0 top-14 bg-foreground/35 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        id="public-mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "absolute bottom-0 right-0 top-14 flex w-[min(22rem,88vw)] flex-col border-l bg-background shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <h2 id={titleId} className="sr-only">
          사이트 메뉴
        </h2>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navNodes.map((menu) => {
            const Icon = MENU_ICON[menu.id as MegaId]
            const expanded = section === menu.id
            if (menu.href && menu.children.length === 0) {
              return (
                <Link
                  key={menu.id}
                  href={menu.href}
                  className="flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-foreground/[0.05]"
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
                    expanded && "bg-foreground/[0.06]"
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
                    {menu.children.map((link) => (
                      <Link
                        key={link.id}
                        href={link.href}
                        className="block rounded-xl px-3 py-2 hover:bg-foreground/[0.05]"
                        onClick={onClose}
                      >
                        <span className="text-sm font-medium">{link.label}</span>
                        {link.note ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">{link.note}</span>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 border-t px-5 py-4">
          <Link
            href={accountHref}
            className="flex-1 rounded-full bg-foreground px-4 py-2.5 text-center text-sm font-medium text-background"
            onClick={onClose}
          >
            {accountLabel}
          </Link>
          <ThemeToggle className="rounded-full" />
        </div>
      </aside>
    </div>
  )
}

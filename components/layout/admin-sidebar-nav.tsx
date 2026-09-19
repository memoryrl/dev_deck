"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { adminNavLabel, isAdminNavActive, type AdminSidebarGroup } from "@/components/layout/admin-nav"
import { getAdminNavIcon } from "@/components/layout/admin-nav-icons"
import { cn } from "@/lib/utils"

/** Dashboard admin nav: 1depth groups from menus.location = admin */

type Props = {
  groups: AdminSidebarGroup[]
  onNavigate?: () => void
}

export function AdminSidebarNav({ groups, onNavigate }: Props) {
  const pathname = usePathname()
  const { t, locale } = useI18n()

  const activeGroupId = useMemo(
    () =>
      groups.find(
        (group) =>
          group.items.some((item) => isAdminNavActive(pathname, item.href)) ||
          (group.href ? isAdminNavActive(pathname, group.href) : false)
      )?.id ?? null,
    [groups, pathname]
  )

  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(activeGroupId ? [activeGroupId] : []))

  useEffect(() => {
    if (!activeGroupId) return
    setOpenIds((prev) => {
      if (prev.has(activeGroupId)) return prev
      const next = new Set(prev)
      next.add(activeGroupId)
      return next
    })
  }, [activeGroupId])

  function toggleGroup(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
      {groups.map((group) => {
        const GroupIcon = getAdminNavIcon(group.iconName)
        const hasChildren = group.items.length > 0
        const groupLabel = adminNavLabel(t, group, locale)

        if (!hasChildren && group.href) {
          const active = isAdminNavActive(pathname, group.href)
          return (
            <Link
              key={group.id}
              href={group.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold",
                active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-muted"
              )}
            >
              <GroupIcon className="size-4 shrink-0 opacity-70" />
              {adminNavLabel(t, group, locale)}
            </Link>
          )
        }

        const open = openIds.has(group.id)
        const groupActive = group.id === activeGroupId
        return (
          <div key={group.id}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => toggleGroup(group.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition-colors",
                groupActive ? "bg-foreground/[0.06] text-foreground" : "text-foreground/80 hover:bg-muted"
              )}
            >
              <GroupIcon className="size-4 shrink-0 opacity-70" />
              <span className="flex-1 text-left">{groupLabel}</span>
              <ChevronDown
                className={cn("size-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")}
              />
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="mb-1 ml-3 mt-1 space-y-0.5 border-l border-foreground/10 pl-2">
                  {group.items.map((item) => {
                    const Icon = getAdminNavIcon(item.iconName)
                    const active = isAdminNavActive(pathname, item.href)
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground/80 hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="size-4 shrink-0 opacity-70" />
                        {adminNavLabel(t, item, locale)}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </nav>
  )
}

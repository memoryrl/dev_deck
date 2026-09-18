"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { adminNavLabel, type AdminSidebarGroup } from "@/components/layout/admin-nav"
import { getAdminNavIcon } from "@/components/layout/admin-nav-icons"
import { cn } from "@/lib/utils"

export function AdminMenuGroups({
  groups,
  onNavigate,
  className,
}: {
  groups: AdminSidebarGroup[]
  onNavigate?: () => void
  className?: string
}) {
  const { t } = useI18n()
  const [openId, setOpenId] = useState<string | null>(null)

  if (groups.length === 0) return null

  return (
    <div className={className}>
      {groups.map((group) => {
        const GroupIcon = getAdminNavIcon(group.iconName)
        const groupLabel = adminNavLabel(t, group)
        const hasChildren = group.items.length > 0

        if (!hasChildren && group.href) {
          return (
            <Link
              key={group.id}
              href={group.href}
              role="menuitem"
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium hover:bg-foreground/[0.05]"
              onClick={onNavigate}
            >
              <GroupIcon className="size-4 opacity-70" />
              {groupLabel}
            </Link>
          )
        }

        const open = openId === group.id
        return (
          <div key={group.id}>
            <button
              type="button"
              aria-expanded={open}
              className={cn(
                "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium hover:bg-foreground/[0.05]",
                open && "bg-foreground/[0.05]"
              )}
              onClick={() => setOpenId(open ? null : group.id)}
            >
              <GroupIcon className="size-4 shrink-0 opacity-70" />
              <span className="flex-1">{groupLabel}</span>
              <ChevronDown
                className={cn("size-3.5 shrink-0 opacity-50 transition-transform", open && "rotate-180")}
              />
            </button>
            {open ? (
              <div className="mb-1 ml-4 space-y-0.5 border-l border-foreground/10 py-0.5 pl-2">
                {group.items.map((item) => {
                  const Icon = getAdminNavIcon(item.iconName)
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      role="menuitem"
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-foreground/[0.05]"
                      onClick={onNavigate}
                    >
                      <Icon className="size-3.5 opacity-70" />
                      {adminNavLabel(t, item)}
                    </Link>
                  )
                })}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

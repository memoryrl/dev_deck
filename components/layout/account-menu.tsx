"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import { ChevronDown, LogOut } from "lucide-react"
import { signOut } from "@/app/(dashboard)/promptkit/actions"
import type { AdminSidebarGroup } from "@/components/layout/admin-nav"
import { AdminMenuGroups } from "@/components/layout/admin-menu-groups"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"
import type { AccessRole } from "@/lib/access"

export type AccountMenuUser = {
  name: string
  email: string
  avatarUrl: string | null
  role: AccessRole
  isOwner: boolean
}

export function AccountMenu({
  user,
  showAdminNav = false,
  compact = false,
  adminMenus = [],
  onOpen,
}: {
  user: AccountMenuUser
  showAdminNav?: boolean
  compact?: boolean
  adminMenus?: AdminSidebarGroup[]
  onOpen?: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const adminLinks = showAdminNav && user.isOwner
  const { t } = useI18n()

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next) onOpen?.()
        }}
        className={cn(
          "inline-flex items-center gap-2 rounded-full text-left transition-colors hover:bg-foreground/[0.06]",
          compact ? "p-1" : "max-w-[14rem] py-1 pl-1 pr-2.5",
          open && "bg-foreground/[0.08]"
        )}
      >
        <UserAvatar name={user.name} src={user.avatarUrl} />
        {compact ? (
          <span className="sr-only">
            {user.name} · {t(`role.${user.role}`)}
          </span>
        ) : (
          <>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight">{user.name}</span>
              <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                {t(`role.${user.role}`)}
              </span>
            </span>
            <ChevronDown className={cn("size-3.5 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[min(18.5rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-foreground/10 bg-background/90 shadow-[0_18px_40px_-24px_hsl(var(--foreground)/0.55)] backdrop-blur-md"
        >
          <div className="flex items-center gap-3 px-3.5 py-3">
            <UserAvatar name={user.name} src={user.avatarUrl} className="size-11" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              {user.email ? <p className="truncate text-xs text-muted-foreground">{user.email}</p> : null}
              <p className="mt-1 inline-flex rounded-full bg-foreground/[0.08] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-foreground/80">
                {t(`role.${user.role}`)}
              </p>
            </div>
          </div>
          {adminLinks ? (
            <div className="max-h-[min(22rem,50vh)] overflow-y-auto border-t border-foreground/10 py-1.5">
              <p className="px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {t("common.admin")}
              </p>
              <AdminMenuGroups groups={adminMenus} onNavigate={() => setOpen(false)} />
            </div>
          ) : null}
          {!user.isOwner ? (
            <div className="border-t border-foreground/10 py-1.5">
              <Link
                href="/account"
                role="menuitem"
                className="block px-3.5 py-2 text-sm font-medium hover:bg-foreground/[0.05]"
                onClick={() => setOpen(false)}
              >
                {t("common.account")}
              </Link>
            </div>
          ) : null}
          <form action={signOut} className="border-t border-foreground/10 p-1.5">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
            >
              <LogOut className="size-4" />
              {t("common.logout")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}

export function UserAvatar({
  name,
  src,
  className,
}: {
  name: string
  src: string | null
  className?: string
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "?"
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className={cn("size-8 shrink-0 rounded-full object-cover ring-1 ring-foreground/10", className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground ring-1 ring-foreground/10",
        className
      )}
    >
      {initial}
    </span>
  )
}

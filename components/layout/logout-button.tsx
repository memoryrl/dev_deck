"use client"

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react"
import { signOut } from "@/app/(dashboard)/promptkit/actions"
import { useI18n } from "@/components/i18n/i18n-provider"
import { showConfirm } from "@/lib/ui/layer-dialog"
import { cn } from "@/lib/utils"

export function LogoutButton({
  className,
  children,
  ...props
}: {
  className?: string
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick">) {
  const { t } = useI18n()
  const [pending, setPending] = useState(false)

  async function onLogout() {
    const ok = await showConfirm(t("common.logoutConfirm"), { title: t("common.logout") })
    if (!ok) return
    setPending(true)
    await signOut()
  }

  return (
    <button
      {...props}
      type="button"
      className={cn(className, pending && "opacity-60")}
      disabled={pending || props.disabled}
      onClick={onLogout}
    >
      {children}
    </button>
  )
}

"use client"

import Link from "next/link"
import { Home } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import type { AdminSidebarGroup } from "@/components/layout/admin-nav"
import { AdminSidebarNav } from "@/components/layout/admin-sidebar-nav"
import { Button } from "@/components/ui/button"

type Props = {
  menus?: AdminSidebarGroup[]
}

export function AppSidebar({ menus = [] }: Props) {
  const { t } = useI18n()

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card p-5 md:flex">
      <div className="mb-8">
        <Link href="/" className="font-display text-xl font-extrabold">
          DevDeck
        </Link>
      </div>
      <AdminSidebarNav groups={menus} />
      <div className="mt-4 shrink-0 space-y-2">
        <LanguageSwitcher fullWidth menuPlacement="up" />
        <Button asChild variant="outline" className="h-10 w-full rounded-full">
          <Link href="/">
            <Home />
            {t("common.siteHome")}
          </Link>
        </Button>
      </div>
    </aside>
  )
}

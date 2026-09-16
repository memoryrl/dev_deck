"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { ADMIN_NAV } from "@/components/layout/admin-nav"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function AppSidebar() {
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card p-5 md:flex">
      <div className="mb-8 flex items-center gap-1">
        <Link href="/" className="font-display text-xl font-extrabold">
          DevDeck
        </Link>
        <LanguageSwitcher />
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {ADMIN_NAV.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold",
                active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          )
        })}
      </nav>
      <Button asChild variant="outline" className="mt-4 h-10 w-full shrink-0 rounded-full">
        <Link href="/">
          <Home />
          {t("common.siteHome")}
        </Link>
      </Button>
    </aside>
  )
}

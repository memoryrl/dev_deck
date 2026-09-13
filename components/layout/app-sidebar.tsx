"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Briefcase, Gamepad2, LayoutList, Menu, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/promptkit", label: "PromptKit", icon: Sparkles },
  { href: "/career", label: "CareerLog", icon: Briefcase },
  { href: "/steam", label: "Steam Tracker", icon: Gamepad2 },
  { href: "/site/boards", label: "게시판", icon: LayoutList },
  { href: "/site/menus", label: "메뉴", icon: Menu },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card p-5 md:block">
      <Link href="/" className="mb-8 block font-display text-xl font-extrabold">
        DevDeck
      </Link>
      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

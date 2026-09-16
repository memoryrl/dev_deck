"use client"

import Link from "next/link"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"
import type { TopologyModuleNode } from "@/lib/landing/topology"

type TopologySideListProps = {
  modules: TopologyModuleNode[]
  order: "first" | "last"
  hoveredId: string | null
  onHoverItem: (id: string | null) => void
}

export function TopologySideList({ modules, order, hoveredId, onHoverItem }: TopologySideListProps) {
  const { t } = useI18n()
  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col gap-5 overflow-y-auto px-5 py-2 md:w-60",
        order === "first" ? "md:order-1" : "md:order-3"
      )}
    >
      {modules.map((module) => (
        <div key={module.id}>
          <Link
            href={module.href}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            {module.label}
          </Link>
          <ul className="mt-2 space-y-1.5">
            {module.items.length === 0 ? (
              <li className="text-xs text-muted-foreground/70">{t("landing.emptyItems")}</li>
            ) : (
              module.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onMouseEnter={() => onHoverItem(item.id)}
                    onMouseLeave={() => onHoverItem(null)}
                    className={cn(
                      "block rounded-lg px-2.5 py-2 text-sm transition-colors",
                      hoveredId === item.id
                        ? "bg-foreground/5 text-foreground"
                        : "text-foreground/80 hover:bg-foreground/5"
                    )}
                  >
                    <p className="truncate font-medium">{item.label}</p>
                    {item.meta ? <p className="truncate text-xs text-muted-foreground">{item.meta}</p> : null}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ))}
    </div>
  )
}

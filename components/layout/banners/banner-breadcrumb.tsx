import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { BreadcrumbItem } from "@/lib/menus/breadcrumb"
import { cn } from "@/lib/utils"

export function BannerBreadcrumb({ crumbs, className, currentClass = "text-foreground" }: { crumbs: BreadcrumbItem[]; className?: string; currentClass?: string }) {
  if (crumbs.length === 0) return null
  return (
    <nav aria-label="breadcrumb" className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground", className)}>
      {crumbs.map((item, index) => {
        const current = !item.href && index === crumbs.length - 1
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? <ChevronRight className="size-3 opacity-50" aria-hidden /> : null}
            {item.href ? (
              <Link href={item.href} className="rounded transition-colors hover:text-current">
                {item.label}
              </Link>
            ) : (
              <span className={current ? currentClass : undefined}>{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

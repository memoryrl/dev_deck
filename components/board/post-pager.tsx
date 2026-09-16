import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getT } from "@/lib/i18n/dictionary"
import type { NeighborLink } from "@/lib/posts/neighbors"
import { cn } from "@/lib/utils"

export function PostPager({
  listHref,
  listLabel,
  prev,
  next,
  placement = "top",
  className,
}: {
  listHref: string
  listLabel?: string
  prev?: NeighborLink | null
  next?: NeighborLink | null
  placement?: "top" | "bottom"
  className?: string
}) {
  const { t } = getT()
  return (
    <nav
      className={cn(
        "flex flex-wrap items-center justify-between gap-2",
        placement === "top" ? "mb-8" : "mt-10",
        className
      )}
      aria-label={t("common.postNav")}
    >
      <Button asChild variant="outline" size="sm">
        <Link href={listHref}>{listLabel ?? t("common.backToList")}</Link>
      </Button>
      <div className="flex items-center gap-2">
        {prev ? (
          <Button asChild variant="outline" size="sm">
            <Link href={prev.href} title={prev.title}>
              <ChevronLeft />
              {t("common.prev")}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft />
            {t("common.prev")}
          </Button>
        )}
        {next ? (
          <Button asChild variant="outline" size="sm">
            <Link href={next.href} title={next.title}>
              {t("common.next")}
              <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            {t("common.next")}
            <ChevronRight />
          </Button>
        )}
      </div>
    </nav>
  )
}

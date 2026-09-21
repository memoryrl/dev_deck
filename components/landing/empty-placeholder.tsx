import type { ReactNode } from "react"
import { Inbox, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 목록·섹션에 보여 줄 데이터가 없을 때 쓰는 빈 상태 영역.
 * - card(기본): 은은한 실선 테두리의 독립 영역(점선은 파일 끌어놓기 영역처럼 보여서 쓰지 않는다)
 * - plain: 표 셀처럼 이미 테두리가 있는 곳 안에서 쓰는 테두리 없는 형태
 */
export function EmptyPlaceholder({
  children,
  className,
  icon: Icon = Inbox,
  variant = "card",
}: {
  children: ReactNode
  className?: string
  icon?: LucideIcon
  variant?: "card" | "plain"
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-5 text-center",
        variant === "card"
          ? "min-h-44 rounded-2xl border border-foreground/10 bg-gradient-to-br from-[hsl(var(--lux-champagne)/0.14)] via-card/40 to-[hsl(var(--lux-cognac)/0.06)] py-10 shadow-sm"
          : "py-10",
        className
      )}
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-foreground/10"
      >
        <Icon className="size-5" />
      </span>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}

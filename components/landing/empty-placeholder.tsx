import type { ReactNode } from "react"
import { Inbox, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 목록·섹션에 보여 줄 데이터가 없을 때 쓰는 빈 상태 영역.
 * - card(기본): 점선 테두리로 "여기에 채워질 자리"를 표시하는 독립 영역
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
          ? "min-h-64 rounded-2xl border border-dashed border-foreground/20 bg-gradient-to-br from-[hsl(var(--lux-champagne)/0.12)] via-transparent to-[hsl(var(--lux-cognac)/0.07)] py-10"
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

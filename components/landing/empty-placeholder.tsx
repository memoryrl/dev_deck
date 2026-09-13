import type { ReactNode } from "react"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function EmptyPlaceholder({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-64 items-center justify-center rounded-2xl border bg-muted/25 px-5",
        className
      )}
    >
      <div className="flex items-center justify-center gap-3">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground"
        >
          <AlertCircle className="size-4" />
        </span>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}

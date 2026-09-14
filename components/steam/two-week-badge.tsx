import { cn, formatPlaytime } from "@/lib/utils"

export function TwoWeekBadge({
  minutes,
  className,
}: {
  minutes: number | null | undefined
  className?: string
}) {
  if (!minutes) return null
  return (
    <span
      className={cn(
        "absolute right-2.5 top-2.5 z-10 rounded-md bg-background/85 px-2 py-0.5 text-xs font-semibold tabular-nums backdrop-blur-sm",
        className
      )}
    >
      2주 {formatPlaytime(minutes)}
    </span>
  )
}

import { cn } from "@/lib/utils"

export function WrittenReviewBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute bottom-2.5 right-2.5 z-10 rounded-md bg-background/85 px-2 py-0.5 text-xs font-semibold backdrop-blur-sm",
        className
      )}
    >
      작성된 리뷰
    </span>
  )
}

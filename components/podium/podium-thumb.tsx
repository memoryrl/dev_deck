import { cn } from "@/lib/utils"

// 게임 커버처럼 실제 이미지가 없는 랭킹(스킬 등)을 위한 대체 타일 — 제목 첫 글자를
// 큼직하게 보여준다.
export function PodiumThumb({
  thumbnailUrl,
  title,
  className,
}: {
  thumbnailUrl?: string | null
  title: string
  className?: string
}) {
  const trimmed = thumbnailUrl?.trim()
  if (trimmed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={trimmed} alt="" className={cn("object-cover", className)} />
    )
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-[hsl(var(--lux-champagne)/0.35)] font-display text-lg font-black text-[hsl(var(--lux-cognac))]",
        className
      )}
    >
      {title.trim().charAt(0).toUpperCase() || "?"}
    </div>
  )
}

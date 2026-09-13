import { cn } from "@/lib/utils"

function DeckGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect
        x="8.2"
        y="2.4"
        width="11.2"
        height="14.8"
        rx="2.2"
        transform="rotate(16 13.8 9.8)"
        className="fill-background stroke-foreground"
        strokeWidth="1.35"
      />
      <rect
        x="5.4"
        y="3.6"
        width="11.2"
        height="14.8"
        rx="2.2"
        transform="rotate(7 11 11)"
        className="fill-background stroke-foreground"
        strokeWidth="1.35"
      />
      <rect x="3.2" y="5.2" width="11.4" height="15" rx="2.3" className="fill-foreground" />
      <path
        d="M6.1 10.4h5.6M6.1 13h4.2"
        className="stroke-background"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function BrandMark({
  wordmark = true,
  className,
  wordmarkClassName,
}: {
  wordmark?: boolean
  className?: string
  wordmarkClassName?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-background/80 text-foreground ring-1 ring-foreground/10">
        <DeckGlyph className="size-5" />
      </span>
      {wordmark ? (
        <span
          className={cn(
            "font-display text-[1.05rem] font-bold tracking-tight",
            wordmarkClassName
          )}
        >
          DevDeck
        </span>
      ) : null}
    </span>
  )
}

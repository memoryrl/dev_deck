"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

export function StarRating({
  name = "rating",
  defaultValue = 0,
  readOnly = false,
  className,
}: {
  name?: string
  defaultValue?: number
  readOnly?: boolean
  className?: string
}) {
  const { t } = useI18n()
  const initial = clampRating(defaultValue)
  const [value, setValue] = useState(initial)
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value

  function select(next: number) {
    if (readOnly) return
    setValue((prev) => (prev === next ? 0 : next))
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {!readOnly ? <input type="hidden" name={name} value={value} /> : null}
      <div
        role={readOnly ? "img" : "radiogroup"}
        aria-label={t("rating.aria")}
        aria-valuenow={shown}
        aria-valuemin={0}
        aria-valuemax={5}
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: 5 }, (_, index) => {
          const fill = Math.min(1, Math.max(0, shown - index))
          return (
            <span key={index} className="relative size-8 shrink-0">
              <Star
                aria-hidden
                className="size-8 text-muted-foreground/35"
                strokeWidth={1.5}
              />
              <span
                aria-hidden
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  className="size-8 fill-[hsl(var(--lux-champagne))] text-[hsl(var(--lux-champagne))]"
                  strokeWidth={1.5}
                />
              </span>
              {!readOnly ? (
                <>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={value === index + 0.5}
                    aria-label={t("rating.points", { value: index + 0.5 })}
                    className="absolute inset-y-0 left-0 w-1/2"
                    onMouseEnter={() => setHover(index + 0.5)}
                    onFocus={() => setHover(index + 0.5)}
                    onClick={() => select(index + 0.5)}
                  />
                  <button
                    type="button"
                    role="radio"
                    aria-checked={value === index + 1}
                    aria-label={t("rating.points", { value: index + 1 })}
                    className="absolute inset-y-0 right-0 w-1/2"
                    onMouseEnter={() => setHover(index + 1)}
                    onFocus={() => setHover(index + 1)}
                    onClick={() => select(index + 1)}
                  />
                </>
              ) : null}
            </span>
          )
        })}
      </div>
      <span className="text-sm tabular-nums text-muted-foreground">
        {shown > 0 ? `${shown} / 5` : t("common.none")}
      </span>
    </div>
  )
}

function clampRating(value: number) {
  if (!Number.isFinite(value)) return 0
  const stepped = Math.round(value * 2) / 2
  return Math.min(5, Math.max(0, stepped))
}

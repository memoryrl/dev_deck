"use client"

import { useEffect, useId, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

export function ScreenshotGallery({
  items,
  title,
}: {
  items: { thumbnail: string; full: string }[]
  title: string
}) {
  const [index, setIndex] = useState<number | null>(null)
  const titleId = useId()
  const { t } = useI18n()
  const open = index !== null
  const current = index !== null ? items[index] : null

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIndex(null)
      if (event.key === "ArrowRight") setIndex((value) => nextIndex(value, items.length, 1))
      if (event.key === "ArrowLeft") setIndex((value) => nextIndex(value, items.length, -1))
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener("keydown", onKey)
    }
  }, [open, items.length])

  if (items.length === 0) return null

  return (
    <>
      <div className={cn("grid gap-2", items.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
        {items.map((item, i) => (
          <button
            key={item.thumbnail}
            type="button"
            className="group relative overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setIndex(i)}
            aria-label={t("steam.screenshotZoom", { title, n: i + 1 })}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbnail}
              alt=""
              className="h-36 w-full object-cover transition duration-300 group-hover:scale-[1.03] md:h-44"
            />
          </button>
        ))}
      </div>

      {open && current ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-8">
          <button
            type="button"
            aria-label={t("steam.screenshotClose")}
            className="absolute inset-0 bg-foreground/70 backdrop-blur-sm"
            onClick={() => setIndex(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[min(92vh,52rem)] w-full max-w-5xl flex-col items-center"
          >
            <h2 id={titleId} className="sr-only">
              {t("steam.screenshotCaption", { title, n: index! + 1, total: items.length })}
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.full}
              alt={t("steam.screenshotAlt", { title, n: index! + 1 })}
              className="max-h-[min(82vh,46rem)] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
            <div className="mt-3 flex items-center gap-2">
              {items.length > 1 ? (
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background"
                  aria-label={t("steam.screenshotPrev")}
                  onClick={() => setIndex((value) => nextIndex(value, items.length, -1))}
                >
                  <ChevronLeft className="size-5" />
                </button>
              ) : null}
              <p className="min-w-[4.5rem] text-center text-sm font-medium text-background">
                {index! + 1} / {items.length}
              </p>
              {items.length > 1 ? (
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background"
                  aria-label={t("steam.screenshotNext")}
                  onClick={() => setIndex((value) => nextIndex(value, items.length, 1))}
                >
                  <ChevronRight className="size-5" />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              className="absolute -top-1 right-0 inline-flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background md:-right-2"
              aria-label={t("common.close")}
              onClick={() => setIndex(null)}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

function nextIndex(value: number | null, length: number, step: number) {
  if (value === null || length === 0) return value
  return (value + step + length) % length
}

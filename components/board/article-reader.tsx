"use client"

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react"
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "devdeck-article-font-scale"
const MIN = 70
const MAX = 130
const DEFAULT = 100
const STEP = 5

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return DEFAULT
  const snapped = Math.round(value / STEP) * STEP
  return Math.min(MAX, Math.max(MIN, snapped))
}

export function ArticleReader({ children }: { children: ReactNode }) {
  const [percent, setPercent] = useState(DEFAULT)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let raw: string | null = null
    try {
      raw = window.localStorage.getItem(STORAGE_KEY)
    } catch {}
    // 저장된 값이 없으면 기본 크기. (Number(null)은 0이라 그대로 clamp하면 최소값 70%가 된다.)
    if (raw !== null) setPercent(clampPercent(Number(raw)))
  }, [])

  function updatePercent(next: number) {
    const value = clampPercent(next)
    setPercent(value)
    window.localStorage.setItem(STORAGE_KEY, String(value))
  }

  return (
    <div
      className="article-reader"
      style={{ "--article-font-scale": String(percent / 100) } as CSSProperties}
    >
      {children}
      <FontSizeDock
        open={open}
        percent={percent}
        onToggle={() => setOpen((value) => !value)}
        onChange={updatePercent}
        onReset={() => updatePercent(DEFAULT)}
      />
    </div>
  )
}

function FontSizeDock({
  open,
  percent,
  onToggle,
  onChange,
  onReset,
}: {
  open: boolean
  percent: number
  onToggle: () => void
  onChange: (value: number) => void
  onReset: () => void
}) {
  const sliderId = useId()
  const { t } = useI18n()
  const atDefault = percent === DEFAULT

  return (
    <div
      className={cn(
        "fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-5 z-40 transition-[width] duration-300 ease-out",
        open ? "w-[min(18rem,calc(100vw-6.5rem))]" : "w-36"
      )}
    >
      <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background/70 shadow-[0_14px_32px_-18px_hsl(var(--foreground)/0.45)] ring-1 ring-[hsl(var(--lux-champagne)/0.28)] backdrop-blur-md">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={sliderId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-xs font-semibold tracking-wide text-foreground/90"
        >
          {t("article.fontSize")}
          {open ? <ChevronDown className="size-3.5 opacity-70" /> : <ChevronUp className="size-3.5 opacity-70" />}
        </button>
        <div
          id={sliderId}
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-2.5 border-t border-foreground/10 px-3.5 pb-3.5 pt-3">
              <div className="flex items-center gap-2.5">
                <span aria-hidden className="text-[11px] text-muted-foreground">
                  가
                </span>
                <div className="relative min-w-0 flex-1">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-foreground/35"
                  />
                  <input
                    type="range"
                    min={MIN}
                    max={MAX}
                    step={STEP}
                    value={percent}
                    aria-valuetext={percent === DEFAULT ? t("article.original") : `${percent}%`}
                    aria-label={t("article.fontSizeAria")}
                    onChange={(event) => onChange(Number(event.target.value))}
                    tabIndex={open ? 0 : -1}
                    className="font-size-range relative z-10 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-foreground/15"
                  />
                </div>
                <span aria-hidden className="font-display text-base font-bold leading-none text-foreground/80">
                  가
                </span>
              </div>
              <button
                type="button"
                onClick={onReset}
                disabled={atDefault}
                tabIndex={open ? 0 : -1}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <RotateCcw className="size-3" />
                {t("article.reset")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

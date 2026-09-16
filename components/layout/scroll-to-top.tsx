"use client"

import { useEffect, useState } from "react"
import { ChevronUp } from "lucide-react"
import { useI18n } from "@/components/i18n/i18n-provider"
import { cn } from "@/lib/utils"

const SHOW_AFTER = 320

export function ScrollToTop() {
  const [visible, setVisible] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    const sync = () => setVisible(window.scrollY > SHOW_AFTER)
    sync()
    window.addEventListener("scroll", sync, { passive: true })
    return () => window.removeEventListener("scroll", sync)
  }, [])

  return (
    <button
      type="button"
      aria-label={t("common.scrollTop")}
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
      }}
      className={cn(
        "fixed bottom-5 right-5 z-40 flex size-12 flex-col items-center justify-center rounded-full border border-foreground/10 bg-primary font-display text-[10px] font-bold tracking-[0.14em] text-primary-foreground shadow-[0_14px_32px_-14px_hsl(var(--foreground)/0.5)] ring-1 ring-[hsl(var(--lux-champagne)/0.5)] transition duration-300 hover:bg-primary/90",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <ChevronUp className="size-4" />
      TOP
    </button>
  )
}
